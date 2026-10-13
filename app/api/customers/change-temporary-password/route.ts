
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  and,
  eq,
} from 'drizzle-orm';

import {
  Database,
} from '@/lib/drizzle';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  hashPassword,
  validatePassword,
} from '@/utils/shared';

import {
  signJWT,
} from '@/utils/jwt';

import {
  verifyCustomerTempPasswordToken,
} from '@/lib/auth/customer-temp-token';

export const runtime = 'nodejs';

const fail = (
  errorMessage: string,
  status: number,
) =>
  NextResponse.json(
    {
      error: true,
      errorMessage,
    },
    {
      status,
    },
  );

export async function POST(
  req: NextRequest,
) {
  let body: Record<string, unknown>;

  try {
    const value: unknown =
      await req.json();

    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return fail(
        'Invalid request body.',
        400,
      );
    }

    body = value as Record<
      string,
      unknown
    >;
  } catch {
    return fail(
      'Invalid request body.',
      400,
    );
  }

  const {
    loginToken,
    currentPassword,
    newPassword,
    confirmPassword,
  } = body;

  if (
    typeof loginToken !== 'string' ||
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string' ||
    !loginToken ||
    !currentPassword
  ) {
    return fail(
      'Missing temporary-login credentials or password fields.',
      422,
    );
  }

  // A permanent first-login password must contain at least 8 characters.
  if (
    newPassword.length < 8
  ) {
    return fail(
      'Password must be at least 8 characters.',
      422,
    );
  }

  if (
    newPassword !== confirmPassword
  ) {
    return fail(
      'Passwords do not match.',
      422,
    );
  }

  if (
    currentPassword === newPassword
  ) {
    return fail(
      'Choose a new password different from the temporary password.',
      422,
    );
  }

  // Verify a SHORT-LIVED, PASSWORD-CHANGE-ONLY token. This is NOT
  // a regular customer session JWT and cannot authorize other APIs.
  const grant =
    await verifyCustomerTempPasswordToken(loginToken);

  if (!grant) {
    return fail(
      'Temporary login expired or invalid. Please sign in again.',
      401,
    );
  }

  try {
    const [customer] =
      await Database
        .select()
        .from(Customers)
        .where(
          eq(
            Customers.id,
            grant.customerId,
          ),
        )
        .limit(1);

    if (
      !customer ||
      customer.deactivated
    ) {
      return fail(
        'Account is unavailable.',
        403,
      );
    }

    if (
      customer.tempPassword !== true
    ) {
      return fail(
        'This account no longer requires a temporary password change.',
        409,
      );
    }

    const valid =
      await validatePassword(
        currentPassword,
        customer.password,
      );

    if (!valid) {
      return fail(
        'Temporary password is incorrect. Please sign in again.',
        401,
      );
    }

    const newHash =
      await hashPassword(
        newPassword,
      );

    // Atomically ensure the temporary password
    // hasn't already been replaced elsewhere.
    const [updated] =
      await Database
        .update(Customers)
        .set({
          password: newHash,
          tempPassword: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              Customers.id,
              customer.id,
            ),
            eq(
              Customers.tempPassword,
              true,
            ),
            eq(
              Customers.password,
              customer.password,
            ),
          ),
        )
        .returning();

    if (!updated) {
      return fail(
        'Account changed during the request. Please sign in again.',
        409,
      );
    }

    // Never return a password hash to mobile.
    const {
      password: _password,
      ...safeCustomer
    } = updated;

    // Keep the customer signed OUT until BOTH onboarding requirements
    // have been satisfied. Phone OTP will issue the session token later.
    if (updated.isPhoneVerified !== true) {
      return NextResponse.json({
        error: false,
        message: 'Password changed. Please verify your phone number.',
        data: {
          customer: safeCustomer,
          requiresVerification: true,
          customerId: updated.id,
          phone: updated.phone,
        },
      });
    }

    // Already phone-verified customers can now establish a normal
    // session. Issue a fresh JWT instead of recycling the temp token.
    const token = await signJWT(
      {
        id: updated.id,
        email: updated.email,
        phone: updated.phone,
      },
      '7d',
    );

    return NextResponse.json({
      error: false,
      message: 'Temporary password changed successfully.',
      data: {
        customer: safeCustomer,
        token,
        requiresVerification: false,
      },
    });
  } catch (error) {
    console.error(
      '[Change temporary password] Error:',
      error,
    );

    return fail(
      'Unable to change the password right now. Please try again.',
      500,
    );
  }
}
