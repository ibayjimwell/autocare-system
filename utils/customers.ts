import { Database } from "@/lib/drizzle";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";

/**
 * Validates the customer data object for creation.
 * @param data - The customer data to validate.
 * @returns An array of validation errors, or an empty array if valid.
 */
export function validateCustomerData(data: any): string[] {
  const errors: string[] = [];

  if (!data.fullname || typeof data.fullname !== 'string' || data.fullname.trim().length === 0) {
    errors.push("Full name is required and must be a non-empty string.");
  }
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push("Email is required and must be a non-empty string.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push("Email must be a valid email address.");
  }
  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length === 0) {
    errors.push("Phone number is required and must be a non-empty string.");
  } else if (!/^\+?[0-9]{7,15}$/.test(data.phone.trim())) {
    errors.push("Phone number must be a valid international format (7-15 digits, optional leading +).");
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push("Password is required and must be at least 6 characters.");
  }

  return errors;
}

/**
 * Validates customer update data (only allow fullname, email, phone).
 * @param data - The update data.
 * @returns An object with errors and sanitized update object.
 */
export function validateCustomerUpdate(data: any): { errors: string[]; updateData: any } {
  const errors: string[] = [];
  const updateData: any = {};
  const allowed = ['fullname', 'email', 'phone'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'string') {
        errors.push(`"${field}" must be a string.`);
        continue;
      }
      const trimmed = data[field].trim();
      if (trimmed.length === 0) {
        errors.push(`"${field}" cannot be empty.`);
        continue;
      }
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        errors.push("Email must be a valid email address.");
        continue;
      }
      if (field === 'phone' && !/^\+?[0-9]{7,15}$/.test(trimmed)) {
        errors.push("Phone number must be a valid international format (7-15 digits, optional leading +).");
        continue;
      }
      updateData[field] = trimmed;
    }
  }

  return { errors, updateData };
}

/**
 * Validates vehicle data for creation.
 */
export function validateVehicleData(data: any): string[] {
  const errors: string[] = [];

  if (!data.plateNumber || typeof data.plateNumber !== 'string' || data.plateNumber.trim().length === 0) {
    errors.push("Plate number is required and must be a non-empty string.");
  }
  if (!data.make || typeof data.make !== 'string' || data.make.trim().length === 0) {
    errors.push("Make is required and must be a non-empty string.");
  }
  if (!data.model || typeof data.model !== 'string' || data.model.trim().length === 0) {
    errors.push("Model is required and must be a non-empty string.");
  }
  if (data.year && (typeof data.year !== 'number' || data.year < 1900 || data.year > new Date().getFullYear() + 1)) {
    errors.push("Year must be a valid year between 1900 and next year.");
  }

  return errors;
}

/**
 * Validates vehicle update – allows partial updates of plateNumber, make, model, year.
 * Year is optional; accepts null, undefined, empty string, or a valid year number.
 */
export function validateVehicleUpdate(data: any): { errors: string[]; updateData: any } {
  const errors: string[] = [];
  const updateData: any = {};
  const allowed = ['plateNumber', 'make', 'model', 'year'];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      if (field === 'year') {
        // Year is optional – allow null, undefined, empty string
        if (data[field] === null || data[field] === undefined || data[field] === '') {
          updateData[field] = null;
        } else {
          const yearNum = Number(data[field]);
          if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
            errors.push("Year must be a valid year between 1900 and next year.");
          } else {
            updateData[field] = yearNum;
          }
        }
      } else {
        // String fields: plateNumber, make, model
        if (typeof data[field] !== 'string') {
          errors.push(`"${field}" must be a string.`);
        } else {
          const trimmed = data[field].trim();
          if (trimmed.length === 0) {
            errors.push(`"${field}" cannot be empty.`);
          } else {
            updateData[field] = trimmed;
          }
        }
      }
    }
  }

  return { errors, updateData };
}

/**
 * Checks if a customer exists by ID.
 */
export async function customerExists(customerId: string): Promise<boolean> {
  const result = await Database.select({ id: Customers.id })
    .from(Customers)
    .where(eq(Customers.id, customerId))
    .limit(1);
  return result.length > 0;
}

/**
 * Validates customer ID and returns error response if invalid or not found.
 * Returns null if valid.
 */
export async function validateCustomerId(customerId: string): Promise<NextResponse | null> {
  if (!isValidUUID(customerId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid customer ID",
        errorMessage: "Customer ID must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 }
    );
  }
  try {
    const exists = await customerExists(customerId);
    if (!exists) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Customer not found",
          errorMessage: "No customer with the given ID exists.",
          errorLog: null,
        },
        { status: 404 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify customer existence.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
  return null;
}

/**
 * Checks if a vehicle exists for a specific customer.
 */
export async function vehicleExists(customerId: string, vehicleId: string): Promise<boolean> {
  const result = await Database.select({ id: Vehicles.id })
    .from(Vehicles)
    .where(eq(Vehicles.id, vehicleId))
    .where(eq(Vehicles.customerId, customerId))
    .limit(1);
  return result.length > 0;
}