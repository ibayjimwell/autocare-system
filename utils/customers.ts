import { Database } from "@/lib/drizzle";

import {
  Customers,
} from "@/database/models/customers/customers.model";

import {
  Vehicles,
} from "@/database/models/customers/vehicles.model";

import {
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import {
  isValidUUID,
} from "./shared";

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from "./phone";

/**
 * Validates customer data for creation.
 *
 * Required:
 * - fullname
 * - phone
 * - password
 *
 * Optional:
 * - email
 *
 * Phone is normalized into:
 *
 * +639XXXXXXXXX
 */
export function validateCustomerData(
  data: any
): string[] {
  const errors: string[] = [];

  // ---------------------------------------------------------------
  // Full name
  // ---------------------------------------------------------------
  if (
    !data.fullname ||
    typeof data.fullname !== "string" ||
    data.fullname.trim().length === 0
  ) {
    errors.push(
      "Full name is required and must be a non-empty string."
    );
  }

  // ---------------------------------------------------------------
  // Email
  //
  // OPTIONAL
  // ---------------------------------------------------------------
  if (
    data.email !== undefined &&
    data.email !== null
  ) {
    if (
      typeof data.email !== "string"
    ) {
      errors.push(
        "Email must be a string."
      );
    } else {
      const email =
        data.email.trim();

      /*
       * Empty email is allowed.
       */
      if (
        email.length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        errors.push(
          "Email must be a valid email address."
        );
      }
    }
  }

  // ---------------------------------------------------------------
  // Phone
  //
  // REQUIRED
  // ---------------------------------------------------------------
  if (
    !data.phone ||
    typeof data.phone !== "string" ||
    data.phone.trim().length === 0
  ) {
    errors.push(
      "Phone number is required and must be a non-empty string."
    );
  } else {
    const normalizedPhone =
      normalizePhilippinePhone(
        data.phone
      );

    if (
      !isValidPhilippinePhone(
        normalizedPhone
      )
    ) {
      errors.push(
        "Phone number must be a valid Philippine mobile number, such as 09157803417 or +639157803417."
      );
    }
  }

  // ---------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------
  if (
    !data.password ||
    typeof data.password !== "string" ||
    data.password.length < 6
  ) {
    errors.push(
      "Password is required and must be at least 6 characters."
    );
  }

  return errors;
}

/**
 * Validates customer update data.
 *
 * Allowed:
 * - fullname
 * - email
 * - phone
 *
 * Email is optional.
 *
 * Sending:
 *
 * email: ""
 *
 * explicitly clears the email and stores NULL.
 */
export function validateCustomerUpdate(
  data: any
): {
  errors: string[];
  updateData: any;
} {
  const errors: string[] = [];
  const updateData: any = {};

  const allowed = [
    "fullname",
    "email",
    "phone",
  ];

  for (
    const field of allowed
  ) {
    if (
      data[field] === undefined
    ) {
      continue;
    }

    // -------------------------------------------------------------
    // Email
    // -------------------------------------------------------------
    if (
      field === "email"
    ) {
      if (
        data[field] === null
      ) {
        updateData.email =
          null;

        continue;
      }

      if (
        typeof data[field] !==
        "string"
      ) {
        errors.push(
          `"${field}" must be a string or null.`
        );

        continue;
      }

      const trimmed =
        data[field].trim();

      /*
       * Empty email means:
       *
       * remove email
       * store NULL
       */
      if (
        trimmed.length === 0
      ) {
        updateData.email =
          null;

        continue;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          trimmed
        )
      ) {
        errors.push(
          "Email must be a valid email address."
        );

        continue;
      }

      updateData.email =
        trimmed.toLowerCase();

      continue;
    }

    // -------------------------------------------------------------
    // Phone
    // -------------------------------------------------------------
    if (
      field === "phone"
    ) {
      if (
        typeof data[field] !==
        "string"
      ) {
        errors.push(
          `"${field}" must be a string.`
        );

        continue;
      }

      const trimmed =
        data[field].trim();

      if (
        trimmed.length === 0
      ) {
        errors.push(
          `"${field}" cannot be empty.`
        );

        continue;
      }

      const normalizedPhone =
        normalizePhilippinePhone(
          trimmed
        );

      if (
        !isValidPhilippinePhone(
          normalizedPhone
        )
      ) {
        errors.push(
          "Phone number must be a valid Philippine mobile number, such as 09157803417 or +639157803417."
        );

        continue;
      }

      updateData.phone =
        normalizedPhone;

      continue;
    }

    // -------------------------------------------------------------
    // Full name
    // -------------------------------------------------------------
    if (
      field === "fullname"
    ) {
      if (
        typeof data[field] !==
        "string"
      ) {
        errors.push(
          `"${field}" must be a string.`
        );

        continue;
      }

      const trimmed =
        data[field].trim();

      if (
        trimmed.length === 0
      ) {
        errors.push(
          `"${field}" cannot be empty.`
        );

        continue;
      }

      updateData.fullname =
        trimmed;

      continue;
    }
  }

  return {
    errors,
    updateData,
  };
}

/**
 * Normalize a customer phone number.
 */
export function normalizeCustomerPhone(
  phone: unknown
): string {
  return normalizePhilippinePhone(
    phone
  );
}

/**
 * Validate a customer phone number.
 */
export function validateCustomerPhone(
  phone: unknown
): boolean {
  const normalized =
    normalizePhilippinePhone(
      phone
    );

  return isValidPhilippinePhone(
    normalized
  );
}

/**
 * Validates vehicle data for creation.
 */
export function validateVehicleData(
  data: any
): string[] {
  const errors: string[] = [];

  if (
    !data.plateNumber ||
    typeof data.plateNumber !==
      "string" ||
    data.plateNumber
      .trim()
      .length === 0
  ) {
    errors.push(
      "Plate number is required and must be a non-empty string."
    );
  }

  if (
    !data.make ||
    typeof data.make !==
      "string" ||
    data.make.trim().length === 0
  ) {
    errors.push(
      "Make is required and must be a non-empty string."
    );
  }

  if (
    !data.model ||
    typeof data.model !==
      "string" ||
    data.model.trim().length === 0
  ) {
    errors.push(
      "Model is required and must be a non-empty string."
    );
  }

  if (
    data.year &&
    (
      typeof data.year !==
        "number" ||
      data.year < 1900 ||
      data.year >
        new Date().getFullYear() +
          1
    )
  ) {
    errors.push(
      "Year must be a valid year between 1900 and next year."
    );
  }

  return errors;
}

/**
 * Validates vehicle update.
 */
export function validateVehicleUpdate(
  data: any
): {
  errors: string[];
  updateData: any;
} {
  const errors: string[] = [];
  const updateData: any = {};

  const allowed = [
    "plateNumber",
    "make",
    "model",
    "year",
  ];

  for (
    const field of allowed
  ) {
    if (
      data[field] === undefined
    ) {
      continue;
    }

    if (
      field === "year"
    ) {
      if (
        data[field] === null ||
        data[field] ===
          undefined ||
        data[field] === ""
      ) {
        updateData[field] =
          null;
      } else {
        const yearNum =
          Number(
            data[field]
          );

        if (
          isNaN(yearNum) ||
          yearNum < 1900 ||
          yearNum >
            new Date().getFullYear() +
              1
        ) {
          errors.push(
            "Year must be a valid year between 1900 and next year."
          );
        } else {
          updateData[field] =
            yearNum;
        }
      }

      continue;
    }

    if (
      typeof data[field] !==
      "string"
    ) {
      errors.push(
        `"${field}" must be a string.`
      );

      continue;
    }

    const trimmed =
      data[field].trim();

    if (
      trimmed.length === 0
    ) {
      errors.push(
        `"${field}" cannot be empty.`
      );

      continue;
    }

    updateData[field] =
      trimmed;
  }

  return {
    errors,
    updateData,
  };
}

/**
 * Checks whether a customer exists by ID.
 */
export async function customerExists(
  customerId: string
): Promise<boolean> {
  const result =
    await Database.select({
      id: Customers.id,
    })
      .from(Customers)
      .where(
        eq(
          Customers.id,
          customerId
        )
      )
      .limit(1);

  return (
    result.length > 0
  );
}

/**
 * Validates customer ID.
 */
export async function validateCustomerId(
  customerId: string
): Promise<NextResponse | null> {
  if (
    !isValidUUID(
      customerId
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType:
          "fve",
        errorTitle:
          "Invalid customer ID",
        errorMessage:
          "Customer ID must be a valid UUID.",
        errorLog:
          null,
      },
      {
        status: 422,
      }
    );
  }

  try {
    const exists =
      await customerExists(
        customerId
      );

    if (!exists) {
      return NextResponse.json(
        {
          error: true,
          errorType:
            "auth",
          errorTitle:
            "Customer not found",
          errorMessage:
            "No customer with the given ID exists.",
          errorLog:
            null,
        },
        {
          status: 404,
        }
      );
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
          "Unable to verify customer existence.",
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

  return null;
}

/**
 * Checks if a vehicle exists for a specific customer.
 */
export async function vehicleExists(
  customerId: string,
  vehicleId: string
): Promise<boolean> {
  const result =
    await Database.select({
      id: Vehicles.id,
    })
      .from(Vehicles)
      .where(
        eq(
          Vehicles.id,
          vehicleId
        )
      )
      .where(
        eq(
          Vehicles.customerId,
          customerId
        )
      )
      .limit(1);

  return (
    result.length > 0
  );
}