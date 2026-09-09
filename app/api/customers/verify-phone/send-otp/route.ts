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

import { eq } from 'drizzle-orm';

import {
  generateOTP,
} from '@/utils/otp';

import {
  sendSMS,
} from '@/utils/sms';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from '@/utils/phone';

export async function POST(
  req: NextRequest
) {
  let body: any;

  // ---------------------------------------------------------------
  // Parse request
  // ---------------------------------------------------------------
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
    newPhone,
  } = body;

  // ---------------------------------------------------------------
  // Validate customer ID
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
  // Determine target phone
  // ---------------------------------------------------------------
  const rawPhone =
    typeof newPhone === 'string' &&
    newPhone.trim() !== ''
      ? newPhone
      : customer.phone;

  const phoneToUse =
    normalizePhilippinePhone(
      rawPhone
    );

  // ---------------------------------------------------------------
  // Validate normalized phone
  // ---------------------------------------------------------------
  if (
    !isValidPhilippinePhone(
      phoneToUse
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'A valid Philippine mobile number is required.',
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // Check duplicate phone if changing phone
  // ---------------------------------------------------------------
  const [existing] =
    await Database.select({
      id: Customers.id,
    })
      .from(Customers)
      .where(
        eq(
          Customers.phone,
          phoneToUse
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
          'Phone number already in use by another account.',
      },
      {
        status: 409,
      }
    );
  }

  // ---------------------------------------------------------------
  // Generate OTP
  // ---------------------------------------------------------------
  const otp =
    generateOTP();

  const expiresAt =
    new Date(
      Date.now() +
        10 * 60 * 1000
    );

  // ---------------------------------------------------------------
  // Remove previous OTPs
  // ---------------------------------------------------------------
  await Database.delete(
    PhoneVerificationOtps
  ).where(
    eq(
      PhoneVerificationOtps.customerId,
      customerId
    )
  );

  // ---------------------------------------------------------------
  // Save OTP
  // ---------------------------------------------------------------
  await Database.insert(
    PhoneVerificationOtps
  ).values({
    customerId:
      customer.id,

    /*
     * Store canonical number.
     */
    phone:
      phoneToUse,

    otp,

    expiresAt,

    used:
      false,
  });

  // ---------------------------------------------------------------
  // Send SMS
  // ---------------------------------------------------------------
  const message =
    `Your AutoCare phone verification OTP is: ${otp}. Valid for 10 minutes.`;

  try {
    await sendSMS(
      phoneToUse,
      message
    );
  } catch (error) {
    console.error(
      '[POST /api/customers/verify-phone/send-otp] SMS error:',
      error
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'sms',
        errorTitle:
          'Failed to send OTP',
        errorMessage:
          'We could not send the verification code to this phone number. Please try again.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 502,
      }
    );
  }

  return NextResponse.json(
    {
      error: false,
      message:
        'OTP sent.',
      data: {
        phone:
          phoneToUse,
      },
    },
    {
      status: 200,
    }
  );
}