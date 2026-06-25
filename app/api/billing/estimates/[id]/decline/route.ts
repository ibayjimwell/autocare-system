import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/billing/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// --------------------------------------------------------------------
// PATCH /api/billing/estimates/:id/decline
// --------------------------------------------------------------------
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

  const { reason } = body;
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Reason required",
      errorMessage: "A reason for declining is required.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    const [estimate] = await Database.select()
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.id, id));
    if (!estimate) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Estimate not found",
        errorMessage: "Estimate does not exist.",
        errorLog: null,
      }, { status: 404 });
    }
    if (estimate.status !== 'WAITING_FOR_APPROVAL') {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Invalid status",
        errorMessage: "Only estimates in WAITING_FOR_APPROVAL can be declined.",
        errorLog: null,
      }, { status: 422 });
    }

    await Database.update(EstimatedCosts)
      .set({
        status: 'DECLINED',
        reason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(EstimatedCosts.id, id));

    // Update appointment to CANCELLED
    await Database.update(Appointments)
      .set({
        status: 'CANCELLED',
        notes: `Estimate declined: ${reason.trim()}`,
        updatedAt: new Date(),
      })
      .where(eq(Appointments.id, estimate.appointmentId));

    return NextResponse.json({
      error: false,
      message: "Estimate declined. Appointment cancelled.",
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/service-tracking/estimates/[id]/decline] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not decline estimate.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}