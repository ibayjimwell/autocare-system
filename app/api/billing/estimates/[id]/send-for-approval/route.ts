import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/billing/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// --------------------------------------------------------------------
// PATCH /api/billing/estimates/:id/send-for-approval
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
    if (estimate.status !== 'PENDING') {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Invalid status",
        errorMessage: "Only estimates with PENDING status can be sent for approval.",
        errorLog: null,
      }, { status: 422 });
    }

    await Database.update(EstimatedCosts)
      .set({ status: 'WAITING_FOR_APPROVAL', updatedAt: new Date() })
      .where(eq(EstimatedCosts.id, id));

    // Update appointment status
    await Database.update(Appointments)
      .set({ status: 'WAITING_FOR_APPROVAL', updatedAt: new Date() })
      .where(eq(Appointments.id, estimate.appointmentId));

    return NextResponse.json({
      error: false,
      message: "Estimate sent for approval.",
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/service-tracking/estimates/send-for-approval] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update estimate status.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}