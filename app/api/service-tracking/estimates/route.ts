import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { InspectionFindings } from "@/database/models/service-tracking/inspection-findings.model";
import { InspectionFindingParts } from "@/database/models/service-tracking/inspection-finding-parts.model";
import { eq, and, inArray } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { appointmentExists } from "@/utils/service-tracking";

// --------------------------------------------------------------------------
// POST /api/service-tracking/estimates
// --------------------------------------------------------------------------
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

  // Verify appointment exists
  const exists = await appointmentExists(appointmentId);
  if (!exists) {
    return NextResponse.json(
      {
        error: true,
        errorType: "auth",
        errorTitle: "Appointment not found",
        errorMessage: "Appointment does not exist.",
        errorLog: null,
      },
      { status: 404 },
    );
  }

  // Check if estimate already exists for this appointment
  const existing = await Database.select()
    .from(EstimatedCosts)
    .where(eq(EstimatedCosts.appointmentId, appointmentId));
  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Estimate exists",
        errorMessage: "An estimate already exists for this appointment.",
        errorLog: null,
      },
      { status: 409 },
    );
  }

  try {
    // 1. Fetch appointment services
    const [appt] = await Database.select()
      .from(Appointments)
      .where(eq(Appointments.id, appointmentId));
    const serviceIds = appt.services || [];
    let serviceSubtotal = 0;
    let serviceDetails: any[] = [];
    if (serviceIds.length > 0) {
      const svcs = await Database.select()
        .from(Services)
        .where(inArray(Services.id, serviceIds));
      serviceDetails = svcs;
      serviceSubtotal = svcs.reduce(
        (sum, s) => sum + (parseFloat(s.basePrice) || 0),
        0,
      );
    }

    // 2. Fetch inspection findings and their parts
    const findings = await Database.select()
      .from(InspectionFindings)
      .where(eq(InspectionFindings.appointmentId, appointmentId));
    let findingsSubtotal = 0;
    const estimateFindingsData = [];

    for (const f of findings) {
      const parts = await Database.select()
        .from(InspectionFindingParts)
        .where(eq(InspectionFindingParts.findingId, f.id));
      let findingPartsTotal = 0;
      const partsData = parts.map((p) => {
        const total = (p.quantity || 1) * parseFloat(p.priceAtTime);
        findingPartsTotal += total;
        return {
          partName: p.partName,
          quantity: p.quantity || 1,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
          totalPrice: total.toString(),
        };
      });
      findingsSubtotal += findingPartsTotal;
      estimateFindingsData.push({
        findingId: f.id,
        description: f.description,
        included: true,
        partsSubtotal: findingPartsTotal.toString(),
        parts: partsData,
      });
    }

    // 3. Create estimate
    const [newEstimate] = await Database.insert(EstimatedCosts)
      .values({
        appointmentId,
        status: "PENDING",
        serviceSubtotal: serviceSubtotal.toString(),
        findingsSubtotal: findingsSubtotal.toString(),
        feesTotal: "0",
        discountTotal: "0",
        grandTotal: (serviceSubtotal + findingsSubtotal).toString(),
      })
      .returning();

    // 4. Create estimate findings and parts
    for (const ef of estimateFindingsData) {
      const [newEstFinding] = await Database.insert(EstimateFindings)
        .values({
          estimateId: newEstimate.id,
          findingId: ef.findingId,
          description: ef.description,
          included: ef.included,
          partsSubtotal: ef.partsSubtotal,
        })
        .returning();

      for (const part of ef.parts) {
        await Database.insert(EstimateFindingParts).values({
          estimateFindingId: newEstFinding.id,
          partName: part.partName,
          quantity: part.quantity,
          priceAtTime: part.priceAtTime,
          isPms: part.isPms,
          totalPrice: part.totalPrice,
        });
      }
    }

    return NextResponse.json(
      {
        error: false,
        message: "Estimate generated.",
        data: newEstimate,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/service-tracking/estimates] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not generate estimate.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
