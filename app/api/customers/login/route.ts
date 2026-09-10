import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  Database,
} from "@/lib/drizzle";

import {
  Customers,
} from "@/database/models/customers/customers.model";

import {
  eq,
  or,
} from "drizzle-orm";

import {
  validatePassword,
} from "@/utils/shared";

import {
  signJWT,
} from "@/utils/jwt";

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from "@/utils/phone";

// ------------------------------------------------------------------
// POST /api/customers/login
//
// Customer can log in using either:
//
// email
// OR
// phone
//
// Request:
// {
//   "emailOrPhone": "john@example.com",
//   "password": "password"
// }
//
// OR:
//
// {
//   "emailOrPhone": "09157803417",
//   "password": "password"
// }
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest
) {
  let body: any;

  // ---------------------------------------------------------------
  // 1. Parse JSON
  // ---------------------------------------------------------------
  try {
    body =
      await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fe",
        errorTitle:
          "Invalid request",
        errorMessage:
          "Request body must be valid JSON.",
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
  // 2. Read credentials
  //
  // emailOrPhone is now the username.
  // ---------------------------------------------------------------
  const {
    emailOrPhone,
    password,
  } = body;

  // ---------------------------------------------------------------
  // 3. Validate username
  // ---------------------------------------------------------------
  if (
    !emailOrPhone ||
    typeof emailOrPhone !==
      "string" ||
    emailOrPhone.trim() === ""
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fve",
        errorTitle:
          "Missing email or phone",
        errorMessage:
          "Email or phone number is required.",
        errorLog:
          null,
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // 4. Validate password
  // ---------------------------------------------------------------
  if (
    !password ||
    typeof password !==
      "string" ||
    password === ""
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fve",
        errorTitle:
          "Missing password",
        errorMessage:
          "Password is required.",
        errorLog:
          null,
      },
      {
        status: 422,
      }
    );
  }

  const identifier =
    emailOrPhone.trim();

  // ---------------------------------------------------------------
  // 5. Determine whether identifier is an email or phone
  // ---------------------------------------------------------------
  const looksLikeEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      identifier
    );

  let customer:
    | any
    | undefined;

  // ---------------------------------------------------------------
  // 6. Email login
  // ---------------------------------------------------------------
  if (looksLikeEmail) {
    try {
      const result =
        await Database.select()
          .from(Customers)
          .where(
            eq(
              Customers.email,
              identifier.toLowerCase()
            )
          )
          .limit(1);

      customer =
        result[0];
    } catch (e) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            "dbe",
          errorTitle:
            "Database error",
          errorMessage:
            "Unable to verify credentials.",
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
    // -------------------------------------------------------------
    // 7. Phone login
    // -------------------------------------------------------------

    const normalizedPhone =
      normalizePhilippinePhone(
        identifier
      );

    /*
     * We only query the phone when it
     * looks like a valid Philippine
     * number.
     */
    if (
      !isValidPhilippinePhone(
        normalizedPhone
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            "auth",
          errorTitle:
            "Invalid credentials",
          errorMessage:
            "Email or phone number is incorrect.",
          errorLog:
            null,
        },
        {
          status: 401,
        }
      );
    }

    try {
      const result =
        await Database.select()
          .from(Customers)
          .where(
            eq(
              Customers.phone,
              normalizedPhone
            )
          )
          .limit(1);

      customer =
        result[0];
    } catch (e) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            "dbe",
          errorTitle:
            "Database error",
          errorMessage:
            "Unable to verify credentials.",
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

  // ---------------------------------------------------------------
  // 8. Customer not found
  // ---------------------------------------------------------------
  if (!customer) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "auth",
        errorTitle:
          "Invalid credentials",
        errorMessage:
          "Email or phone number or password is incorrect.",
        errorLog:
          null,
      },
      {
        status: 401,
      }
    );
  }

  // ---------------------------------------------------------------
  // 9. Deactivated customer
  // ---------------------------------------------------------------
  if (
    customer.deactivated
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "auth",
        errorTitle:
          "Account deactivated",
        errorMessage:
          "Your account is deactivated. Please contact the admin for assistance.",
        errorLog:
          null,
      },
      {
        status: 403,
      }
    );
  }

  // ---------------------------------------------------------------
  // 10. Validate password
  // ---------------------------------------------------------------
  let isPasswordValid:
    | boolean = false;

  try {
    isPasswordValid =
      await validatePassword(
        password,
        customer.password
      );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "se",
        errorTitle:
          "Password validation error",
        errorMessage:
          "Internal error while checking password.",
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

  if (
    !isPasswordValid
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "auth",
        errorTitle:
          "Invalid credentials",
        errorMessage:
          "Email or phone number or password is incorrect.",
        errorLog:
          null,
      },
      {
        status: 401,
      }
    );
  }

  // ---------------------------------------------------------------
  // 11. Phone verification required
  // ---------------------------------------------------------------
  if (
    !customer.isPhoneVerified
  ) {
    /*
     * Do not issue an authentication
     * token before phone verification.
     */
    return NextResponse.json(
      {
        error: false,
        message:
          "Phone verification required.",
        data: {
          requiresVerification:
            true,

          customerId:
            customer.id,

          phone:
            customer.phone,
        },
      },
      {
        status: 200,
      }
    );
  }

  // ---------------------------------------------------------------
  // 12. Generate JWT
  //
  // Email can now be NULL.
  // ---------------------------------------------------------------
  const token =
    await signJWT(
      {
        id:
          customer.id,

        email:
          customer.email,

        phone:
          customer.phone,
      },
      "7d"
    );

  // ---------------------------------------------------------------
  // 13. Remove password
  // ---------------------------------------------------------------
  const {
    password: _password,
    ...customerWithoutPassword
  } = customer;

  // ---------------------------------------------------------------
  // 14. Success
  // ---------------------------------------------------------------
  return NextResponse.json(
    {
      error: false,
      message:
        "Login successful.",
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