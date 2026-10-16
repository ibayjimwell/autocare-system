import { Database } from "@/lib/drizzle";
import { Services } from "@/database/models/services/services.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";
import { SERVICE_TYPES, REPAIR_SUBCATEGORIES } from '@/app-utils/services/helpers';

/**
 * Validates service data for creation/update.
 */
export function validateServiceData(data: any): string[] {
  const errors: string[] = [];
  if (typeof data?.name !== 'string' || !data.name.trim() || data.name.trim().length > 100) {
    errors.push('Service name is required (up to 100 characters).');
  }
  if (data.description != null && typeof data.description !== 'string') errors.push('Description must be a string.');
  if (data.basePrice != null && data.basePrice !== '') {
    const price = Number(data.basePrice);
    if (!Number.isFinite(price) || price < 0) errors.push('Base price must be zero or greater.');
  }
  const duration = Number(data.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1) errors.push('Duration must be a positive integer.');
  if (!SERVICE_TYPES.includes(data.type)) errors.push('Service category must be PMS, REPAIR, or DIAGNOSTIC.');
  const subcategory = typeof data.subcategory === 'string' ? data.subcategory.trim() : '';
  if (data.type === 'REPAIR' && !REPAIR_SUBCATEGORIES.includes(subcategory as any)) {
    errors.push('Select a valid REPAIR subcategory.');
  }
  if (data.type !== 'REPAIR' && subcategory) errors.push('Only REPAIR services may have a subcategory.');
  if (typeof data.isLaborInclude !== 'boolean' && data.isLaborInclude !== 'true' && data.isLaborInclude !== 'false') {
    errors.push('Labor inclusion must be true or false.');
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