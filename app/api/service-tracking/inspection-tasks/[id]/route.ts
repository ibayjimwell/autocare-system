import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { eq } from "drizzle-orm";
import { validateTaskId } from "@/utils/service-tracking";
import { isValidUUID } from "@/utils/shared";

// ------------------------------------------------------------------
// PUT /api/service-tracking/inspection-tasks/[id] – Update task title
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateTaskId(id);
  if (validationError) return validationError;

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

  const { title } = body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid title",
      errorMessage: "Task title is required.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    const [updated] = await Database.update(InspectionTasks)
      .set({ title: title.trim(), updatedAt: new Date() })
      .where(eq(InspectionTasks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Task not found",
        errorMessage: "Task does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: "Task updated.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PUT /api/service-tracking/inspection-tasks/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update task.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}