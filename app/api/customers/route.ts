import { Database } from '@/lib/drizzle';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getFormDataEntries,
  hashPassword,
} from '@/utils/shared';

import {
  validateCustomerData,
} from '@/utils/customers';

import {
  normalizePhilippinePhone,
} from '@/utils/phone';

import {
  eq,
} from 'drizzle-orm';

import {
  customersTriggers,
} from '@/triggers/customers';

// ------------------------------------------------------------------
// Normalize optional email.
//
// IMPORTANT:
//
// FormData converts:
//   null      -> "null"
//   undefined -> "undefined"
//
// Both must be treated as no email.
//
// Returns:
//   null                    when email is not provided
//   lowercase email string  when email exists
// ------------------------------------------------------------------
function normalizeOptionalEmail(
  value: unknown
): string | null {
  // Actual null / undefined
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  // Non-string values are not valid email values.
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  /*
   * FormData can turn JavaScript null
   * into the literal string "null".
   *
   * Treat those values as empty.
   */
  if (
    normalized === '' ||
    normalized === 'null' ||
    normalized === 'undefined'
  ) {
    return null;
  }

  return normalized;
}

// ------------------------------------------------------------------
// POST /api/customers
// Create a new customer
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest
) {
  let rawData: any;

  // ---------------------------------------------------------------
  // 1. Parse form data
  // ---------------------------------------------------------------
  try {
    rawData =
      await getFormDataEntries(
        req
      );

    console.log(
      '[POST /api/customers] Parsed rawData:',
      JSON.stringify(
        rawData,
        null,
        2
      )
    );
  } catch (e) {
    console.error(
      '[POST /api/customers] Form data parse error:',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'fe',
        errorTitle:
          'Form data error',
        errorMessage:
          'Could not read submitted form data.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 400,
      }
    );
  }

  // ---------------------------------------------------------------
  // 2. Normalize phone BEFORE validation
  //
  // Phone is REQUIRED.
  //
  // Example:
  // 09157803413
  //      ↓
  // +639157803413
  // ---------------------------------------------------------------
  const normalizedPhone =
    normalizePhilippinePhone(
      rawData.phone
    );

  rawData.phone =
    normalizedPhone;

  // ---------------------------------------------------------------
  // 3. Normalize OPTIONAL email BEFORE validation
  //
  // IMPORTANT:
  //
  // If FormData sent:
  //
  // "null"
  //
  // this becomes:
  //
  // null
  //
  // before validateCustomerData() is called.
  // ---------------------------------------------------------------
  const normalizedEmail =
    normalizeOptionalEmail(
      rawData.email
    );

  rawData.email =
    normalizedEmail;

  console.log(
    '[POST /api/customers] Normalized values:',
    {
      phone:
        normalizedPhone,

      email:
        normalizedEmail,
    }
  );

  // ---------------------------------------------------------------
  // 4. Validate customer data
  // ---------------------------------------------------------------
  const validationErrors =
    validateCustomerData(
      rawData
    );

  if (
    validationErrors.length >
    0
  ) {
    console.warn(
      '[POST /api/customers] Validation errors:',
      validationErrors
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'fve',
        errorTitle:
          'Creating failed',
        errorMessage:
          validationErrors.join(
            ' '
          ),
        errorLog:
          validationErrors,
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // 5. Normalize standard values
  // ---------------------------------------------------------------
  const fullname =
    rawData.fullname.trim();

  /*
   * Email is OPTIONAL.
   *
   * When absent:
   *
   * email = null
   */
  const email =
    normalizedEmail;

  /*
   * Phone is REQUIRED and already
   * normalized.
   */
  const phone =
    normalizedPhone;

  // ---------------------------------------------------------------
  // 6. Check email uniqueness
  //
  // Only perform this query when
  // an email was actually provided.
  // ---------------------------------------------------------------
  if (email) {
    try {
      console.log(
        '[POST /api/customers] Checking email uniqueness:',
        email
      );

      const existingEmail =
        await Database.select({
          id:
            Customers.id,
        })
          .from(Customers)
          .where(
            eq(
              Customers.email,
              email
            )
          )
          .limit(1);

      console.log(
        '[POST /api/customers] Email check:',
        existingEmail.length >
          0
          ? 'DUPLICATE'
          : 'OK'
      );

      if (
        existingEmail.length >
        0
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType:
              'fve',
            errorTitle:
              'Duplicate email',
            errorMessage:
              `Email "${email}" is already registered.`,
            errorLog:
              null,
          },
          {
            status: 409,
          }
        );
      }
    } catch (e) {
      console.error(
        '[POST /api/customers] Email check error:',
        e
      );

      return NextResponse.json(
        {
          error: true,
          errorType:
            'dbe',
          errorTitle:
            'Database error',
          errorMessage:
            'Unable to verify email.',
          errorLog:
            e instanceof Error
              ? e.message
              : String(e),
        },
        {
          status: 500,
        }
      );
    }
  } else {
    console.log(
      '[POST /api/customers] Email is optional. Skipping email uniqueness check.'
    );
  }

  // ---------------------------------------------------------------
  // 7. Check normalized phone uniqueness
  // ---------------------------------------------------------------
  try {
    console.log(
      '[POST /api/customers] Checking phone uniqueness:',
      phone
    );

    const existingPhone =
      await Database.select({
        id:
          Customers.id,
      })
        .from(Customers)
        .where(
          eq(
            Customers.phone,
            phone
          )
        )
        .limit(1);

    console.log(
      '[POST /api/customers] Phone check:',
      existingPhone.length >
        0
        ? 'DUPLICATE'
        : 'OK'
    );

    if (
      existingPhone.length >
      0
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            'fve',
          errorTitle:
            'Duplicate phone',
          errorMessage:
            `Phone "${phone}" is already registered.`,
          errorLog:
            null,
        },
        {
          status: 409,
        }
      );
    }
  } catch (e) {
    console.error(
      '[POST /api/customers] Phone check error:',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Unable to verify phone.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      }
    );
  }

  // ---------------------------------------------------------------
  // 8. Hash password
  // ---------------------------------------------------------------
  let hashedPassword: string;

  try {
    hashedPassword =
      await hashPassword(
        rawData.password
      );
  } catch (e) {
    console.error(
      '[POST /api/customers] Password hashing error:',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'se',
        errorTitle:
          'Password hashing failed',
        errorMessage:
          'Internal error while securing password.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      }
    );
  }

  // ---------------------------------------------------------------
  // 9. Insert customer
  // ---------------------------------------------------------------
  try {
    const [
      newCustomer,
    ] =
      await Database.insert(
        Customers
      )
        .values({
          fullname,

          /*
           * Optional email.
           *
           * This will be:
           *
           * null
           *
           * when no email was provided.
           */
          email,

          /*
           * ALWAYS canonical:
           *
           * +639XXXXXXXXX
           */
          phone,

          password:
            hashedPassword,

          tempPassword:
            rawData.tempPassword ??
            true,

          /*
           * New customer must verify
           * their phone.
           */
          isPhoneVerified:
            false,

          deactivated:
            false,

          isOnline:
            false,
        })
        .returning();

    console.log(
      '[POST /api/customers] Customer created:',
      {
        id:
          newCustomer.id,

        fullname:
          newCustomer.fullname,

        email:
          newCustomer.email,

        phone:
          newCustomer.phone,
      }
    );

    // -------------------------------------------------------------
    // Remove password before response
    // -------------------------------------------------------------
    const {
      password,
      ...customerWithoutPassword
    } = newCustomer;

    // -------------------------------------------------------------
    // Trigger notification only when email exists
    // -------------------------------------------------------------
    if (
      customerWithoutPassword.email
    ) {
      customersTriggers
        .onNew({
          fullname:
            customerWithoutPassword.fullname,

          email:
            customerWithoutPassword.email,
        })
        .catch(
          console.error
        );
    }

    return NextResponse.json(
      {
        error: false,
        message:
          'Customer registered successfully.',
        data:
          customerWithoutPassword,
      },
      {
        status: 201,
      }
    );
  } catch (e) {
    console.error(
      '[POST /api/customers] Insert error:',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'dbe',
        errorTitle:
          'Database insertion failed',
        errorMessage:
          'Could not save customer.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      }
    );
  }
}

// ------------------------------------------------------------------
// GET /api/customers
// Retrieve all customers
// ------------------------------------------------------------------
export async function GET() {
  try {
    const customers =
      await Database.select({
        id:
          Customers.id,

        fullname:
          Customers.fullname,

        email:
          Customers.email,

        phone:
          Customers.phone,

        isPhoneVerified:
          Customers.isPhoneVerified,

        deactivated:
          Customers.deactivated,

        createdAt:
          Customers.createdAt,

        updatedAt:
          Customers.updatedAt,

        isOnline:
          Customers.isOnline,

        lastSeenAt:
          Customers.lastSeenAt,
      })
        .from(Customers)
        .orderBy(
          Customers.updatedAt
        );

    return NextResponse.json(
      {
        error: false,
        message:
          'Customers retrieved successfully.',
        data: customers,
      },
      {
        status: 200,
      }
    );
  } catch (e) {
    console.error(
      '[GET /api/customers] Database query error:',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType:
          'dbe',
        errorTitle:
          'Database query error',
        errorMessage:
          'Unable to fetch customers.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      }
    );
  }
}