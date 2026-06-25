import { Database } from "@/lib/drizzle";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isValidUUID } from "./shared";

export function validateTaskData(data: any): string[] {
  const errors: string[] = [];
  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim().length === 0
  ) {
    errors.push("Task title is required.");
  }
  if (!data.appointmentId || !isValidUUID(data.appointmentId)) {
    errors.push("Valid appointment ID is required.");
  }
  return errors;
}

export async function appointmentExists(
  appointmentId: string,
): Promise<boolean> {
  const result = await Database.select({ id: Appointments.id })
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);
  return result.length > 0;
}

export async function taskExists(taskId: string): Promise<boolean> {
  const result = await Database.select({ id: InspectionTasks.id })
    .from(InspectionTasks)
    .where(eq(InspectionTasks.id, taskId))
    .limit(1);
  return result.length > 0;
}

export async function validateTaskId(
  taskId: string,
): Promise<NextResponse | null> {
  if (!isValidUUID(taskId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid task ID",
        errorMessage: "Task ID must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  const exists = await taskExists(taskId);
  if (!exists) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Task not found",
        errorMessage: "Task does not exist.",
        errorLog: null,
      },
      { status: 404 },
    );
  }
  return null;
}
