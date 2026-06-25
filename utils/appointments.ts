// utils/appointments.ts
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";

/**
 * Generate a unique tracking number
 * Format: AC-{timestamp}-{random 4 digits}
 */
export function generateTrackingNumber(): string {
  const now = new Date();
  const datePart = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `AC-${datePart}-${randomPart}`;
}

/**
 * Validate appointment data for creation
 * (Services validation is handled separately in the POST handler)
 */
export function validateAppointmentData(data: any): string[] {
  const errors: string[] = [];

  if (!data.customerId || typeof data.customerId !== 'string' || !isValidUUID(data.customerId)) {
    errors.push("Customer ID is required and must be a valid UUID.");
  }
  if (!data.vehicleId || typeof data.vehicleId !== 'string' || !isValidUUID(data.vehicleId)) {
    errors.push("Vehicle ID is required and must be a valid UUID.");
  }
  if (!data.appointmentDate || typeof data.appointmentDate !== 'string') {
    errors.push("Appointment date is required.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.appointmentDate)) {
    errors.push("Appointment date must be in YYYY-MM-DD format.");
  }
  if (!data.appointmentTime || typeof data.appointmentTime !== 'string') {
    errors.push("Appointment time is required.");
  } else if (!/^\d{2}:\d{2}$/.test(data.appointmentTime)) {
    errors.push("Appointment time must be in HH:MM format.");
  }
  if (data.notes && typeof data.notes !== 'string') {
    errors.push("Notes must be a string.");
  }

  return errors;
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['UNDER_INSPECTION', 'CANCELLED'],
    'UNDER_INSPECTION': ['WAITING_FOR_APPROVAL', 'CONFIRMED', 'CANCELLED'],
    'WAITING_FOR_APPROVAL': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'WAITING_FOR_APPROVAL', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': [],
  };
  return transitions[from]?.includes(to) || false;
}

/**
 * Check if a service exists by ID
 */
export async function serviceExists(serviceId: string): Promise<boolean> {
  const result = await Database.select({ id: Services.id })
    .from(Services)
    .where(eq(Services.id, serviceId))
    .limit(1);
  return result.length > 0;
}

/**
 * Check if an appointment exists
 */
export async function appointmentExists(appointmentId: string): Promise<boolean> {
  const result = await Database.select({ id: Appointments.id })
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);
  return result.length > 0;
}

/**
 * Validate appointment ID and return error if invalid
 */
export async function validateAppointmentId(appointmentId: string): Promise<NextResponse | null> {
  if (!isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid appointment ID",
      errorMessage: "Appointment ID must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }
  try {
    const exists = await appointmentExists(appointmentId);
    if (!exists) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Appointment not found",
        errorMessage: "No appointment with the given ID exists.",
        errorLog: null,
      }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to verify appointment existence.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
  return null;
}