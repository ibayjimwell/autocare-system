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
  sql,
} from "drizzle-orm";

import {
  validateCustomerId,
  validateCustomerUpdate,
} from "@/utils/customers";

/**
 * Remove password before returning customer.
 */
function stripPassword(
  customer: any
) {
  const {
    password,
    ...rest
  } = customer;

  return rest;
}

// ------------------------------------------------------------------
// GET /api/customers/[id]
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id: customerId,
  } = await params;

  // ---------------------------------------------------------------
  // Validate customer ID
  // ---------------------------------------------------------------
  const validationError =
    await validateCustomerId(
      customerId
    );

  if (validationError) {
    return validationError;
  }

  // ---------------------------------------------------------------
  // Fetch customer
  // ---------------------------------------------------------------
  try {
    const [
      customer,
    ] = await Database.select()
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
          errorType:
            "auth",
          errorTitle:
            "Customer not found",
          errorMessage:
            "Customer does not exist.",
          errorLog:
            null,
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error: false,
        message:
          "Customer retrieved successfully.",
        data:
          stripPassword(
            customer
          ),
      },
      {
        status: 200,
      }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "dbe",
        errorTitle:
          "Database error",
        errorMessage:
          "Unable to fetch customer details.",
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
// PUT /api/customers/[id]
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id: customerId,
  } = await params;

  // ---------------------------------------------------------------
  // 1. Validate customer ID
  // ---------------------------------------------------------------
  const validationError =
    await validateCustomerId(
      customerId
    );

  if (validationError) {
    return validationError;
  }

  // ---------------------------------------------------------------
  // 2. Parse JSON
  // ---------------------------------------------------------------
  let body: any;

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
  // 3. Validate update data
  // ---------------------------------------------------------------
  const {
    errors,
    updateData,
  } =
    validateCustomerUpdate(
      body
    );

  if (
    errors.length > 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fve",
        errorTitle:
          "Validation failed",
        errorMessage:
          errors.join(" "),
        errorLog:
          errors,
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // 4. Check that there is something to update
  // ---------------------------------------------------------------
  if (
    Object.keys(
      updateData
    ).length === 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fve",
        errorTitle:
          "No fields to update",
        errorMessage:
          "At least one of 'fullname', 'email', or 'phone' must be provided.",
        errorLog:
          null,
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // 5. Get existing customer BEFORE updating
  // ---------------------------------------------------------------
  let existingCustomer:
    | any
    | null = null;

  try {
    const [
      customer,
    ] =
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
          errorType:
            "auth",
          errorTitle:
            "Customer not found",
          errorMessage:
            "Customer does not exist.",
          errorLog:
            null,
        },
        {
          status: 404,
        }
      );
    }

    existingCustomer =
      customer;
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "dbe",
        errorTitle:
          "Database error",
        errorMessage:
          "Unable to retrieve the existing customer.",
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
  // 6. Detect phone change
  // ---------------------------------------------------------------
  let phoneChanged =
    false;

  if (
    updateData.phone !==
    undefined
  ) {
    const existingPhone =
      String(
        existingCustomer.phone ||
          ""
      ).trim();

    const updatedPhone =
      String(
        updateData.phone ||
          ""
      ).trim();

    phoneChanged =
      existingPhone !==
      updatedPhone;

    console.log(
      "[PUT /api/customers/[id] Phone comparison]",
      {
        customerId,
        existingPhone,
        updatedPhone,
        phoneChanged,
        currentVerification:
          existingCustomer.isPhoneVerified,
      }
    );

    /*
     * New phone must be verified again.
     *
     * Same normalized phone does NOT invalidate
     * the existing verification.
     */
    if (phoneChanged) {
      updateData.isPhoneVerified =
        false;
    }
  }

  // ---------------------------------------------------------------
  // 7. Check email uniqueness
  //
  // NULL does not need a duplicate check.
  // ---------------------------------------------------------------
  try {
    if (
      updateData.email !==
        undefined &&
      updateData.email !==
        null
    ) {
      const existing =
        await Database.select({
          id:
            Customers.id,
        })
          .from(Customers)
          .where(
            eq(
              Customers.email,
              updateData.email
            )
          )
          .limit(1);

      if (
        existing.length >
          0 &&
        existing[0].id !==
          customerId
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType:
              "fve",
            errorTitle:
              "Duplicate email",
            errorMessage:
              `Email "${updateData.email}" is already taken.`,
            errorLog:
              null,
          },
          {
            status: 409,
          }
        );
      }
    }

    // -------------------------------------------------------------
    // Phone uniqueness
    // -------------------------------------------------------------
    if (
      updateData.phone
    ) {
      const existing =
        await Database.select({
          id:
            Customers.id,
        })
          .from(Customers)
          .where(
            eq(
              Customers.phone,
              updateData.phone
            )
          )
          .limit(1);

      if (
        existing.length >
          0 &&
        existing[0].id !==
          customerId
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType:
              "fve",
            errorTitle:
              "Duplicate phone",
            errorMessage:
              `Phone "${updateData.phone}" is already taken.`,
            errorLog:
              null,
          },
          {
            status: 409,
          }
        );
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "dbe",
        errorTitle:
          "Database error",
        errorMessage:
          "Unable to verify uniqueness.",
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
  // 8. Update timestamp
  // ---------------------------------------------------------------
  updateData.updatedAt =
    sql`NOW()`;

  // ---------------------------------------------------------------
  // 9. Update database
  // ---------------------------------------------------------------
  try {
    const [
      updatedCustomer,
    ] =
      await Database.update(
        Customers
      )
        .set(
          updateData
        )
        .where(
          eq(
            Customers.id,
            customerId
          )
        )
        .returning();

    if (
      !updatedCustomer
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            "auth",
          errorTitle:
            "Update failed",
          errorMessage:
            "Customer not found.",
          errorLog:
            null,
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      "[PUT /api/customers/[id] Customer updated]",
      {
        customerId,

        email:
          updatedCustomer.email,

        phoneChanged,

        previousPhone:
          existingCustomer.phone,

        newPhone:
          updatedCustomer.phone,

        previousIsPhoneVerified:
          existingCustomer.isPhoneVerified,

        newIsPhoneVerified:
          updatedCustomer.isPhoneVerified,
      }
    );

    return NextResponse.json(
      {
        error: false,

        message:
          phoneChanged
            ? "Customer updated successfully. The new phone number must be verified again."
            : "Customer updated successfully.",

        data:
          stripPassword(
            updatedCustomer
          ),
      },
      {
        status: 200,
      }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "dbe",
        errorTitle:
          "Database update error",
        errorMessage:
          "Could not update customer.",
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