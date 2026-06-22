import { Database } from "@/lib/drizzle";
import { Services } from "@/database/models/services/services.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";

/**
 * Validates service data for creation/update.
 */
export function validateServiceData(data: any): string[] {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push("Service name is required.");
  }
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push("Description must be a string.");
  }
  if (data.basePrice !== undefined && data.basePrice !== null) {
    const price = parseFloat(data.basePrice);
    if (isNaN(price) || price < 0) {
      errors.push("Base price must be a positive number.");
    }
  }
  if (!data.durationMinutes) {
    errors.push("Duration (minutes) is required.");
  } else {
    const duration = parseInt(data.durationMinutes, 10);
    if (isNaN(duration) || duration < 1) {
      errors.push("Duration must be a positive integer.");
    }
  }
  return errors;
}

/**
 * Checks if a service exists by ID.
 */
export async function serviceExists(serviceId: string): Promise<boolean> {
  const result = await Database.select({ id: Services.id })
    .from(Services)
    .where(eq(Services.id, serviceId))
    .limit(1);
  return result.length > 0;
}

/**
 * Validates service ID and returns error response if invalid or not found.
 * Returns null if valid.
 */
export async function validateServiceId(serviceId: string): Promise<NextResponse | null> {
  if (!isValidUUID(serviceId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid service ID",
      errorMessage: "Service ID must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }
  try {
    const exists = await serviceExists(serviceId);
    if (!exists) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Service not found",
        errorMessage: "No service with the given ID exists.",
        errorLog: null,
      }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify service existence.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
  return null;
}