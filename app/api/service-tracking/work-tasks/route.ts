import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { WorkTasks } from "@/database/models/service-tracking/work-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq, sql } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { appointmentExists } from "@/utils/service-tracking";
import { getTrackingNumber } from "@/utils/service-tracking/get-tracking-number";
import { serviceTrackingTriggers } from "@/triggers/service-tracking";

// ------------------------------------------------------------------
// GET /api/service-tracking/work-tasks?appointmentId=...
// ------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get('appointmentId');
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid appointment ID",
      errorMessage: "appointmentId is required and must be a valid UUID.",
      errorLog: null,
    }, { status: 400 });
  }

  try {
    const tasks = await Database.select()
      .from(WorkTasks)
      .where(eq(WorkTasks.appointmentId, appointmentId))
      .orderBy(WorkTasks.order);
    return NextResponse.json({
      error: false,
      message: "Work tasks retrieved.",
      data: tasks,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/service-tracking/work-tasks] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch work tasks.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/service-tracking/work-tasks
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid JSON",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const { appointmentId, title, order, durationMinutes } = body;

  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid appointment",
      errorMessage: "appointmentId is required and must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Missing title",
      errorMessage: "Task title is required.",
      errorLog: null,
    }, { status: 422 });
  }

  // Verify appointment exists
  const exists = await appointmentExists(appointmentId);
  if (!exists) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Appointment not found",
      errorMessage: "Appointment does not exist.",
      errorLog: null,
    }, { status: 404 });
  }

  // Get current max order for this appointment
  const [maxOrderResult] = await Database.select({ maxOrder: sql<number>`max(${WorkTasks.order})` })
    .from(WorkTasks)
    .where(eq(WorkTasks.appointmentId, appointmentId));
  const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;

  try {
    const [newTask] = await Database.insert(WorkTasks)
      .values({
        appointmentId,
        title: title.trim(),
        status: 'PENDING',
        order: order !== undefined ? order : nextOrder,
        durationMinutes: durationMinutes ?? null,
      })
      .returning();

    const trackingNumber = await getTrackingNumber(appointmentId);
    serviceTrackingTriggers.onWorkTaskAdded({ taskTitle: newTask.title, trackingNumber }).catch(console.error);

    return NextResponse.json({
      error: false,
      message: "Work task created.",
      data: newTask,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/service-tracking/work-tasks] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not create work task.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}