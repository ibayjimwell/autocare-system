import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { WorkTasks } from "@/database/models/service-tracking/work-tasks.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { getTrackingNumber } from "@/utils/service-tracking/get-tracking-number";
import { serviceTrackingTriggers } from "@/triggers/service-tracking";

// ------------------------------------------------------------------
// PATCH /api/service-tracking/work-tasks/:id/status
// ------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid ID",
      errorMessage: "ID must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }

  // Verify task exists – directly query the WorkTasks table
  const [existingTask] = await Database
    .select({ id: WorkTasks.id, status: WorkTasks.status, startedAt: WorkTasks.startedAt })
    .from(WorkTasks)
    .where(eq(WorkTasks.id, id))
    .limit(1);

  if (!existingTask) {
    return NextResponse.json({
      error: true,
      errorType: "auth",
      errorTitle: "Task not found",
      errorMessage: "Task does not exist.",
      errorLog: null,
    }, { status: 404 });
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

  const { status } = body;
  if (!status || !['PENDING', 'IN_PROGRESS', 'DONE'].includes(status)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid status",
      errorMessage: "Status must be PENDING, IN_PROGRESS, or DONE.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    const updateData: any = { status, updatedAt: new Date() };

    // Set startedAt when status becomes IN_PROGRESS for the first time
    if (status === 'IN_PROGRESS' && existingTask.status !== 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    const [updated] = await Database.update(WorkTasks)
      .set(updateData)
      .where(eq(WorkTasks.id, id))
      .returning();

    if (updated) {
      const trackingNumber = await getTrackingNumber(updated.appointmentId);
      if (status === 'IN_PROGRESS') {
        serviceTrackingTriggers.onWorkTaskStarted({ taskTitle: updated.title, trackingNumber }).catch(console.error);
      } else if (status === 'DONE') {
        serviceTrackingTriggers.onWorkTaskDone({ taskTitle: updated.title, trackingNumber }).catch(console.error);
      }
    }

    return NextResponse.json({
      error: false,
      message: "Work task status updated.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/service-tracking/work-tasks/[id]/status] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update task status.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}