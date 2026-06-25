// app/api/service-tracking/work-tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { WorkTasks } from "@/database/models/service-tracking/work-tasks.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { taskExists } from "@/utils/service-tracking";

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

  // Verify task exists
  const exists = await taskExists(id);
  if (!exists) {
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
    const [updated] = await Database.update(WorkTasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(WorkTasks.id, id))
      .returning();

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