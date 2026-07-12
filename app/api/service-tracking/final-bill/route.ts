import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { WorkTasks } from "@/database/models/service-tracking/work-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { generateFinalBill } from "@/utils/final-bill";
import { getAppointmentInfo } from "@/utils/payments/get-appointment-info";
import { paymentsTriggers } from "@/triggers/payments";

export async function POST(req: NextRequest) {
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

  const { appointmentId } = body;
  if (!appointmentId || !isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid appointment",
        errorMessage: "appointmentId is required and must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    // 1. Check if all work tasks are DONE
    const workTasks = await Database.select()
      .from(WorkTasks)
      .where(eq(WorkTasks.appointmentId, appointmentId));
    if (workTasks.some((t) => t.status !== "DONE")) {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Work not complete",
          errorMessage:
            "All work tasks must be completed before generating the final bill.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    // 2. Get the approved estimate for this appointment
    const [estimate] = await Database.select()
      .from(EstimatedCosts)
      .where(
        and(
          eq(EstimatedCosts.appointmentId, appointmentId),
          eq(EstimatedCosts.status, "APPROVED"),
        ),
      );
    if (!estimate) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "No approved estimate",
          errorMessage: "This appointment does not have an approved estimate.",
          errorLog: null,
        },
        { status: 404 },
      );
    }

    // 3. Generate final bill
    const finalBill = await generateFinalBill(appointmentId, estimate.id);

    // 4. Update appointment status to COMPLETED (or maybe keep IN_PROGRESS until payment)
    await Database.update(Appointments)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(Appointments.id, appointmentId));

    const info = await getAppointmentInfo(appointmentId);
    paymentsTriggers.onFinalBillGenerated({
      trackingNumber: info.trackingNumber,
      customerName: info.customerName,
    }).catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message: "Final bill generated.",
        data: finalBill,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/service-tracking/final-bill] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not generate final bill.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
