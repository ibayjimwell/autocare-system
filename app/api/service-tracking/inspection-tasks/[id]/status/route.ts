import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { validateTaskId } from "@/utils/service-tracking";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/staffs/auth";

// ------------------------------------------------------------------
// PATCH /api/service-tracking/inspection-tasks/:id/status – Update task status
// ------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateTaskId(id);
  if (validationError) return validationError;

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
    // Get current task to check if startedAt should be set
    const [currentTask] = await Database
      .select({ status: InspectionTasks.status, startedAt: InspectionTasks.startedAt })
      .from(InspectionTasks)
      .where(eq(InspectionTasks.id, id))
      .limit(1);

    if (!currentTask) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Task not found",
        errorMessage: "Task does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    const updateData: any = { status, updatedAt: new Date() };

    // Set startedAt when moving to IN_PROGRESS for the first time
    if (status === 'IN_PROGRESS' && currentTask.status !== 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    const [updated] = await Database.update(InspectionTasks)
      .set(updateData)
      .where(eq(InspectionTasks.id, id))
      .returning();

    return NextResponse.json({
      error: false,
      message: "Task status updated.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/service-tracking/tasks/[id]/status] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update task status.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}