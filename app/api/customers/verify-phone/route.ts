import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { Database } from '@/lib/drizzle';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  PhoneVerificationOtps,
} from '@/database/models/customers/phone-verification-otps.model';

import {
  eq,
  and,
  sql,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from '@/utils/phone';

import {
  signJWT,
} from '@/utils/jwt';

export async function POST(
  req: NextRequest
) {
  let body: any;

  try {
    body =
      await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid JSON',
      },
      {
        status: 400,
      }
    );
  }

  const {
    customerId,
    otp,
    newPhone,
  } = body;

  // ---------------------------------------------------------------
  // Validate customerId
  // ---------------------------------------------------------------
  if (
    !customerId ||
    !isValidUUID(customerId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Valid customer ID is required.',
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // Validate OTP
  // ---------------------------------------------------------------
  if (
    !otp ||
    typeof otp !== 'string' ||
    !/^\d{6}$/.test(
      otp.trim()
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Valid 6-digit OTP is required.',
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // Find customer
  // ---------------------------------------------------------------
  const [customer] =
    await Database.select()
      .from(Customers)
      .where(
        eq(
          Customers.id,
          customerId
        )
      )
      .limit(1);

  if (!customer) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Customer not found.',
      },
      {
        status: 404,
      }
    );
  }

  // ---------------------------------------------------------------
  // Find valid OTP
  // ---------------------------------------------------------------
  const [otpRecord] =
    await Database.select()
      .from(PhoneVerificationOtps)
      .where(
        and(
          eq(
            PhoneVerificationOtps.customerId,
            customerId
          ),

          eq(
            PhoneVerificationOtps.otp,
            otp.trim()
          ),

          eq(
            PhoneVerificationOtps.used,
            false
          ),

          sql`${PhoneVerificationOtps.expiresAt} > NOW()`
        )
      )
      .limit(1);

  if (!otpRecord) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid or expired OTP.',
      },
      {
        status: 400,
      }
    );
  }

  // ---------------------------------------------------------------
  // Normalize new phone if supplied
  // ---------------------------------------------------------------
  let normalizedNewPhone:
    | string
    | null = null;

  if (
    typeof newPhone === 'string' &&
    newPhone.trim() !== ''
  ) {
    normalizedNewPhone =
      normalizePhilippinePhone(
        newPhone
      );

    if (
      !isValidPhilippinePhone(
        normalizedNewPhone
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Invalid Philippine phone number.',
        },
        {
          status: 422,
        }
      );
    }

    // Check duplicate
    const [existing] =
      await Database.select({
        id: Customers.id,
      })
        .from(Customers)
        .where(
          eq(
            Customers.phone,
            normalizedNewPhone
          )
        )
        .limit(1);

    if (
      existing &&
      existing.id !== customerId
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Phone number is already in use.',
        },
        {
          status: 409,
        }
      );
    }
  }

  // ---------------------------------------------------------------
  // Mark OTP used
  // ---------------------------------------------------------------
  await Database.update(
    PhoneVerificationOtps
  )
    .set({
      used: true,
    })
    .where(
      eq(
        PhoneVerificationOtps.id,
        otpRecord.id
      )
    );

  // ---------------------------------------------------------------
  // Update customer
  // ---------------------------------------------------------------
  const updateData: {
    isPhoneVerified: boolean;
    phone?: string;
  } = {
    isPhoneVerified:
      true,
  };

  if (
    normalizedNewPhone
  ) {
    updateData.phone =
      normalizedNewPhone;
  }

  await Database.update(
    Customers
  )
    .set(updateData)
    .where(
      eq(
        Customers.id,
        customerId
      )
    );

  // ---------------------------------------------------------------
  // Fetch updated customer
  // ---------------------------------------------------------------
  const [updatedCustomer] =
    await Database.select()
      .from(Customers)
      .where(
        eq(
          Customers.id,
          customerId
        )
      )
      .limit(1);

  if (!updatedCustomer) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Customer could not be refreshed.',
      },
      {
        status: 500,
      }
    );
  }

  const {
    password,
    ...customerWithoutPassword
  } = updatedCustomer;

  // ---------------------------------------------------------------
  // Generate new authentication token
  // ---------------------------------------------------------------
  const token =
    await signJWT(
      {
        id:
          customerWithoutPassword.id,

        email:
          customerWithoutPassword.email,
      },
      '7d'
    );

  return NextResponse.json(
    {
      error: false,
      message:
        'Phone verified successfully.',
      data: {
        customer:
          customerWithoutPassword,

        token,
      },
    },
    {
      status: 200,
    }
  );
}