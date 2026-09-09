import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from "./phone";

/**
 * Validates the customer data object for creation.
 *
 * Phone numbers may be entered in common Philippine formats:
 *
 * 09157803417
 * 9157803417
 * 639157803417
 * +639157803417
 * +63 915 780 3417
 *
 * The actual canonical database format should be:
 *
 * +639157803417
 *
 * @param data - The customer data to validate.
 * @returns An array of validation errors, or an empty array if valid.
 */
export function validateCustomerData(
  data: any
): string[] {
  const errors: string[] = [];

  // ---------------------------------------------------------------
  // Full Name
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
  // ---------------------------------------------------------------
  if (
    !data.email ||
    typeof data.email !== "string" ||
    data.email.trim().length === 0
  ) {
    errors.push(
      "Email is required and must be a non-empty string."
    );
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      data.email.trim()
    )
  ) {
    errors.push(
      "Email must be a valid email address."
    );
  }

  // ---------------------------------------------------------------
  // Phone
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
 * Only these fields are allowed:
 *
 * - fullname
 * - email
 * - phone
 *
 * Phone numbers are automatically normalized into canonical
 * Philippine international format:
 *
 * +639XXXXXXXXX
 *
 * @param data - The update data.
 * @returns An object containing validation errors and sanitized data.
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

  // ---------------------------------------------------------------
  // Validate allowed fields
  // ---------------------------------------------------------------
  for (const field of allowed) {
    if (
      data[field] === undefined
    ) {
      continue;
    }

    // -------------------------------------------------------------
    // All allowed fields must be strings
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // Empty value
    // -------------------------------------------------------------
    if (
      trimmed.length === 0
    ) {
      errors.push(
        `"${field}" cannot be empty.`
      );

      continue;
    }

    // -------------------------------------------------------------
    // Email validation
    // -------------------------------------------------------------
    if (
      field === "email"
    ) {
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
    // Phone validation + normalization
    // -------------------------------------------------------------
    if (
      field === "phone"
    ) {
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

      /*
       * IMPORTANT:
       *
       * The update payload already contains the canonical format.
       *
       * Example:
       *
       * 09157803417
       *      ↓
       * +639157803417
       */
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
 * Normalizes a customer phone number into the canonical
 * Philippine international format.
 *
 * Canonical format:
 *
 * +639XXXXXXXXX
 *
 * Examples:
 *
 * 09157803417       -> +639157803417
 * 9157803417        -> +639157803417
 * 639157803417      -> +639157803417
 * +639157803417     -> +639157803417
 * +63 915 780 3417 -> +639157803417
 */
export function normalizeCustomerPhone(
  phone: unknown
): string {
  return normalizePhilippinePhone(
    phone
  );
}

/**
 * Checks whether a customer phone number is a valid
 * Philippine mobile number.
 *
 * This accepts common user-entered formats because the
 * value is normalized before validation.
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

  // ---------------------------------------------------------------
  // Plate Number
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // Make
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // Model
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // Year
  // ---------------------------------------------------------------
  if (
    data.year &&
    (
      typeof data.year !==
        "number" ||
      data.year < 1900 ||
      data.year >
        new Date().getFullYear() + 1
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
 *
 * Allows partial updates of:
 *
 * - plateNumber
 * - make
 * - model
 * - year
 *
 * Year is optional and accepts:
 *
 * - null
 * - undefined
 * - empty string
 * - valid year number
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

  for (const field of allowed) {
    if (
      data[field] === undefined
    ) {
      continue;
    }

    // -------------------------------------------------------------
    // Year
    // -------------------------------------------------------------
    if (
      field === "year"
    ) {
      /*
       * Year is optional.
       *
       * Allow:
       * null
       * undefined
       * empty string
       */
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

    // -------------------------------------------------------------
    // String fields:
    //
    // plateNumber
    // make
    // model
    // -------------------------------------------------------------
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
 * Checks if a customer exists by ID.
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
 * Validates customer ID and returns an error response
 * if invalid or not found.
 *
 * Returns null if valid.
 */
export async function validateCustomerId(
  customerId: string
): Promise<NextResponse | null> {
  // ---------------------------------------------------------------
  // Validate UUID format
  // ---------------------------------------------------------------
  if (
    !isValidUUID(
      customerId
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle:
          "Invalid customer ID",
        errorMessage:
          "Customer ID must be a valid UUID.",
        errorLog: null,
      },
      {
        status: 422,
      }
    );
  }

  // ---------------------------------------------------------------
  // Verify customer exists
  // ---------------------------------------------------------------
  try {
    const exists =
      await customerExists(
        customerId
      );

    if (!exists) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle:
            "Customer not found",
          errorMessage:
            "No customer with the given ID exists.",
          errorLog: null,
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
        errorType: "dbe",
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