import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { validateTaskData, appointmentExists } from "@/utils/service-tracking";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/staffs/auth";
import { isValidUUID } from "@/utils/shared";
import { getTrackingNumber } from "@/utils/service-tracking/get-tracking-number";
import { serviceTrackingTriggers } from "@/triggers/service-tracking";
import { mobileInspectionTaskTriggers } from "@/app-triggers/inspection-task";

// ------------------------------------------------------------------
// GET /api/service-tracking/inspection-tasks?appointmentId=...
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
      .from(InspectionTasks)
      .where(eq(InspectionTasks.appointmentId, appointmentId))
      .orderBy(InspectionTasks.order);
    return NextResponse.json({
      error: false,
      message: "Tasks retrieved.",
      data: tasks,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/service-tracking/tasks] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch tasks.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/service-tracking/inspection-tasks – Create a new task
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Unauthorized",
      errorMessage: "You must be logged in.",
      errorLog: null,
    }, { status: 401 });
  }

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

  const errors = validateTaskData(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  const { appointmentId, title, order, durationMinutes } = body;

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

  // If this is the first task, change appointment status to UNDER_INSPECTION
  const existingTasks = await Database.select({ count: sql`count(*)` })
    .from(InspectionTasks)
    .where(eq(InspectionTasks.appointmentId, appointmentId));
  const taskCount = Number(existingTasks[0]?.count || 0);

  try {
    const [newTask] = await Database.insert(InspectionTasks)
      .values({
        appointmentId,
        title: title.trim(),
        order: order || taskCount + 1,
        status: 'PENDING',
        durationMinutes: durationMinutes ?? null,   // new field
      })
      .returning();

     // Staff trigger
    const trackingNumber = await getTrackingNumber(appointmentId);
    serviceTrackingTriggers.onInspectionTaskAdded({
      taskTitle: newTask.title,
      trackingNumber,
    }).catch(console.error);

    // Mobile customer trigger 
    mobileInspectionTaskTriggers.onTaskAdded({
      appointmentId,
      taskTitle: newTask.title,
    }).catch(console.error);

    // If this is the first task, update appointment status to UNDER_INSPECTION
    if (taskCount === 0) {
      await Database.update(Appointments)
        .set({ status: 'UNDER_INSPECTION', updatedAt: new Date() })
        .where(eq(Appointments.id, appointmentId));
    }

    return NextResponse.json({
      error: false,
      message: "Task created.",
      data: newTask,
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/service-tracking/tasks] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database insertion failed",
      errorMessage: "Could not create task.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}