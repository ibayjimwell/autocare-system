import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Services } from "@/database/models/services/services.model";
import { eq } from "drizzle-orm";
import { validateServiceId, validateServiceData } from "@/utils/services";

// ------------------------------------------------------------------
// GET /api/services/[id] – Get a single service
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateServiceId(id);
  if (validationError) return validationError;

  try {
    const [service] = await Database.select()
      .from(Services)
      .where(eq(Services.id, id))
      .limit(1);
    if (!service) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Service not found",
        errorMessage: "Service does not exist.",
        errorLog: null,
      }, { status: 404 });
    }
    return NextResponse.json({
      error: false,
      message: "Service retrieved successfully.",
      data: service,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/services/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch service details.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// PUT /api/services/[id] – Update a service
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const validationError = await validateServiceId(id);
  if (validationError) return validationError;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid request",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const errors = validateServiceData(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  // Check name uniqueness excluding self
  if (body.name) {
    try {
      const existing = await Database.select()
        .from(Services)
        .where(eq(Services.name, body.name.trim()))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return NextResponse.json({
          error: true,
          errorType: "fve",
          errorTitle: "Duplicate service name",
          errorMessage: `Service name "${body.name}" already exists.`,
          errorLog: null,
        }, { status: 409 });
      }
    } catch (e) {
      return NextResponse.json({
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to verify service name.",
        errorLog: e instanceof Error ? e.message : String(e),
      }, { status: 500 });
    }
  }

  // Build update data – map frontend fields to DB columns
  const updateData: any = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;
  if (body.basePrice !== undefined) updateData.basePrice = body.basePrice ? parseFloat(body.basePrice) : null;
  if (body.durationMinutes) updateData.estimatedDuration = parseInt(body.durationMinutes, 10); // ← key change
  if (body.type) updateData.type = body.type.trim();
  updateData.updatedAt = new Date();

  try {
    const [updated] = await Database.update(Services)
      .set(updateData)
      .where(eq(Services.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Update failed",
        errorMessage: "Service not found.",
        errorLog: null,
      }, { status: 404 });
    }
    return NextResponse.json({
      error: false,
      message: "Service updated successfully.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PUT /api/services/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update service.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}