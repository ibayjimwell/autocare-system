import { Database } from "@/lib/drizzle";
import { Staffs } from "@/database/models/staffs/staffs.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "./shared";
import { NextResponse } from "next/server";

/**
 * Validates the staff data object.
 * @param data - The staff data to validate.
 * @returns An array of validation errors, or an empty array if the data is valid.
 */
export function validateStaffData(data: StaffType) {
  const errors: string[] = [];

  if (!data.fullname || typeof data.fullname !== 'string' || data.fullname.trim().length === 0) {
    errors.push("Full name is required and must be a non-empty string.");
  }
  if (!data.username || typeof data.username !== 'string' || data.username.trim().length === 0) {
    errors.push("Username is required and must be a non-empty string.");
  }
  if (data.role && typeof data.role !== 'string') {
    errors.push("Role must be a string if provided.");
  }
  
  return errors;
}

/**
 * Generates a temporary password based on username + random numbers.
 * Format: username + 4-digit random number (e.g., "john1234")
 * Falls back to random string if username is missing.
 */
export function generateTempPassword(username: string): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const sanitizedUsername = username.replace(/\s/g, '').toLowerCase();
  return `${sanitizedUsername}${randomNum}`;
}

/**
 * Checks if a staff member exists in the database.
 * @param staffId - The UUID of the staff member to check.
 * @returns A promise that resolves to `true` if the staff exists, `false` otherwise.
 */
export async function staffExists(staffId: string): Promise<boolean> {
  const result = await Database.select({ id: Staffs.id })
    .from(Staffs)
    .where(eq(Staffs.id, staffId))
    .limit(1);
  return result.length > 0;
}

/**
 * Validates staff ID and returns error response if invalid or not found.
 * Returns null if valid (staff exists). The caller can then proceed.
 * @param staffId - The UUID of the staff member to validate.
 * @returns A promise that resolves to a `NextResponse` if invalid, or `null` if valid.
 */
export async function validateStaffId(staffId: string): Promise<NextResponse | null> {
  if (!isValidUUID(staffId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid staff ID",
        errorMessage: "Staff ID must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 }
    );
  }
  try {
    const exists = await staffExists(staffId);
    if (!exists) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Staff not found",
          errorMessage: "No staff member with the given ID exists.",
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
        errorMessage: "Unable to verify staff existence.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
  return null; // valid
}

/**
 * Allowed module fields for access control.
 */
export const ALLOWED_ACCESS_FIELDS = [
  "dashboard",
  "customers",
  "appointments",
  "services",
  "staffs",
  "serviceTracking",
  "payments",
  "inventory",  
] as const;

export type AccessField = typeof ALLOWED_ACCESS_FIELDS[number];

/**
 * Validates a request body for access update: checks that all provided fields are booleans.
 * Returns an error response if invalid, or null if valid with the sanitized updateData.
 * @param body - The request body to validate.
 * @param requireAtLeastOne - Whether at least one field must be provided (default: false).
 * @returns An object containing an error response (if invalid) and the sanitized updateData.
 */
export function validateAccessBody(
  body: any,
  requireAtLeastOne = false
): { error: NextResponse | null; updateData: Partial<Record<AccessField, boolean>> } {
  const updateData: Partial<Record<AccessField, boolean>> = {};
  let hasField = false;

  for (const field of ALLOWED_ACCESS_FIELDS) {
    if (body[field] !== undefined) {
      hasField = true;
      if (typeof body[field] !== "boolean") {
        return {
          error: NextResponse.json(
            {
              error: true,
              errorType: "fve",
              errorTitle: "Invalid field type",
              errorMessage: `Field "${field}" must be a boolean (true/false).`,
              errorLog: null,
            },
            { status: 422 }
          ),
          updateData: {},
        };
      }
      updateData[field] = body[field];
    }
  }

  if (requireAtLeastOne && !hasField) {
    return {
      error: NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "No fields to update",
          errorMessage: "At least one module permission must be provided.",
          errorLog: null,
        },
        { status: 422 }
      ),
      updateData: {},
    };
  }

  return { error: null, updateData };
}