import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Services } from "@/database/models/services/services.model";
import { eq } from "drizzle-orm";
import { validateServiceId } from "@/utils/services";
import { servicesTriggers } from "@/triggers/services";

// ------------------------------------------------------------------
// POST /api/services/[id]/enable – Enable a service (set active = true)
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateServiceId(id);
  if (validationError) return validationError;

  try {
    const [updated] = await Database.update(Services)
      .set({ active: true, updatedAt: new Date() })
      .where(eq(Services.id, id))
      .returning();
    
    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Enable failed",
        errorMessage: "Service not found.",
        errorLog: null,
      }, { status: 404 });
    }

    if (updated) {
      servicesTriggers.onEnabled({ name: updated.name }).catch(console.error);
    }
    
    return NextResponse.json({
      error: false,
      message: "Service enabled successfully.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not enable service.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}