
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
  verifyJWT,
} from '@/utils/jwt';

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

  // Same password rule as mobile Sign-up.
  if (
    newPassword.length < 6
  ) {
    return fail(
      'Password must be at least 6 characters.',
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

  // Validate the JWT issued by the successful
  // customer login.
  const decoded =
    await verifyJWT(loginToken);

  if (
    !decoded ||
    typeof decoded.id !== 'string' ||
    decoded.purpose !== undefined
  ) {
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
            decoded.id,
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

    return NextResponse.json({
      error: false,
      message:
        'Temporary password changed successfully.',
      data: {
        customer: safeCustomer,
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
