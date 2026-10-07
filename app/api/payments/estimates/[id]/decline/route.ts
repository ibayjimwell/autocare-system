import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { getAppointmentInfo } from "@/utils/payments/get-appointment-info";
import { paymentsTriggers } from "@/triggers/payments";
import { mobilePaymentsTriggers } from "@/app-triggers/payments";
import { restoreAppointmentKeptInventory } from "@/utils/inventory/appointment-inventory";
import { inventoryTriggers } from "@/triggers/inventory";

// --------------------------------------------------------------------
// PATCH /api/payments/estimates/:id/decline
// --------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid ID",
        errorMessage: "ID must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid JSON",
        errorMessage: "Request body must be valid JSON.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  const { reason } = body;
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Reason required",
        errorMessage: "A reason for declining is required.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    const [estimate] = await Database.select()
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.id, id));
    if (!estimate) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Estimate not found",
          errorMessage: "Estimate does not exist.",
          errorLog: null,
        },
        { status: 404 },
      );
    }
    if (estimate.status !== "WAITING_FOR_APPROVAL") {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Invalid status",
          errorMessage:
            "Only estimates in WAITING_FOR_APPROVAL can be declined.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    await Database.update(EstimatedCosts)
      .set({
        status: "DECLINED",
        reason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(EstimatedCosts.id, id));

    // Update appointment to CANCELLED
    await Database.update(Appointments)
      .set({
        status: "CANCELLED",
        notes: `Estimate declined: ${reason.trim()}`,
        updatedAt: new Date(),
      })
      .where(eq(Appointments.id, estimate.appointmentId));

    // Return any inventory that was being held for this appointment.
    // The helper is idempotent because only KEPT rows are restored.
    const restoredInventory =
      await restoreAppointmentKeptInventory(
        Database,
        estimate.appointmentId,
      );

    if (restoredInventory.length > 0) {
      const totalQuantity =
        restoredInventory.reduce(
          (sum: number, item: any) =>
            sum + (Number(item.quantity) || 0),
          0,
        );

      inventoryTriggers
        .onRestored({
          itemName:
            `${restoredInventory.length} item(s) from cancelled appointment`,
          quantity: totalQuantity,
        })
        .catch(console.error);
    }

    await recordPaymentTransaction({ entityType: 'ESTIMATE', entityId: id, appointmentId: estimate.appointmentId, eventType: 'STATUS_CHANGED', fromStatus: estimate.status, toStatus: 'DECLINED', amount: estimate.grandTotal, details: { reason: reason.trim() } });

    const info = await getAppointmentInfo(estimate.appointmentId);
    mobilePaymentsTriggers.onEstimateDeclined({
      customerId: info.customerId,
      trackingNumber: info.trackingNumber,
      appointmentId: estimate.appointmentId,
      estimateId: id,
      reason: reason.trim(),
    }).catch(console.error);

    paymentsTriggers.onEstimateDeclined({
      trackingNumber: info.trackingNumber,
      customerName: info.customerName,
      reason: reason.trim(),
    }).catch(console.error);
    

    return NextResponse.json(
      {
        error: false,
        message: "Estimate declined. Appointment cancelled.",
      },
      { status: 200 },
    );
  } catch (e) {
    console.error(
      "[PATCH /api/service-tracking/estimates/[id]/decline] Error:",
      e,
    );
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database update error",
        errorMessage: "Could not decline estimate.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
