import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { EstimateTasks } from "@/database/models/payments/estimate-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Services } from "@/database/models/services/services.model";
import { InspectionFindings } from "@/database/models/service-tracking/inspection-findings.model";
import { InspectionFindingParts } from "@/database/models/service-tracking/inspection-finding-parts.model";
import { InspectionTasks } from "@/database/models/service-tracking/inspection-tasks.model";
import { eq, inArray, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// --------------------------------------------------------------------------
// PUT /api/service-tracking/estimates/[id] – Refresh estimate with latest data
// --------------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: estimateId } = await params;
  if (!isValidUUID(estimateId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid ID",
        errorMessage: "Estimate ID must be a valid UUID.",
      },
      { status: 422 }
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
      },
      { status: 400 }
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
      },
      { status: 422 }
    );
  }

  try {
    const [existingEstimate] = await Database.select()
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.id, estimateId));
    if (!existingEstimate) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Estimate not found",
          errorMessage: "Estimate does not exist.",
        },
        { status: 404 }
      );
    }
    if (existingEstimate.appointmentId !== appointmentId) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Mismatch",
          errorMessage: "Estimate does not belong to this appointment.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch latest services
    const [appt] = await Database.select()
      .from(Appointments)
      .where(eq(Appointments.id, appointmentId));
    const serviceIds = appt.services || [];
    let serviceSubtotal = 0;
    if (serviceIds.length > 0) {
      const svcs = await Database.select()
        .from(Services)
        .where(inArray(Services.id, serviceIds));
      serviceSubtotal = svcs.reduce(
        (sum, s) => sum + (parseFloat(s.basePrice) || 0),
        0
      );
    }

    // 2. Fetch latest findings with parts
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

    // 3. Fetch completed inspection tasks
    const completedTasks = await Database.select()
      .from(InspectionTasks)
      .where(
        and(
          eq(InspectionTasks.appointmentId, appointmentId),
          eq(InspectionTasks.status, 'DONE')
        )
      );

    // 4. Delete existing estimate details (findings, parts, tasks)
    const existingEstFindings = await Database.select()
      .from(EstimateFindings)
      .where(eq(EstimateFindings.estimateId, estimateId));
    if (existingEstFindings.length > 0) {
      const estFindingIds = existingEstFindings.map((ef) => ef.id);
      await Database.delete(EstimateFindingParts).where(
        inArray(EstimateFindingParts.estimateFindingId, estFindingIds)
      );
      await Database.delete(EstimateFindings).where(
        eq(EstimateFindings.estimateId, estimateId)
      );
    }
    await Database.delete(EstimateTasks).where(
      eq(EstimateTasks.estimateId, estimateId)
    );

    // 5. Re-insert findings, parts, tasks
    for (const ef of estimateFindingsData) {
      const [newEstFinding] = await Database.insert(EstimateFindings)
        .values({
          estimateId: estimateId,
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
    for (const task of completedTasks) {
      await Database.insert(EstimateTasks).values({
        estimateId: estimateId,
        taskId: task.id,
        title: task.title,
        durationMinutes: task.durationMinutes,
        status: 'DONE',
      });
    }

    // 6. Update estimate totals (preserve fees/discounts if they exist)
    const grandTotal = serviceSubtotal + findingsSubtotal +
      parseFloat(existingEstimate.feesTotal || '0') -
      parseFloat(existingEstimate.discountTotal || '0');

    await Database.update(EstimatedCosts)
      .set({
        serviceSubtotal: serviceSubtotal.toString(),
        findingsSubtotal: findingsSubtotal.toString(),
        grandTotal: grandTotal.toString(),
        updatedAt: new Date(),
      })
      .where(eq(EstimatedCosts.id, estimateId));

    const [updatedEstimate] = await Database.select()
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.id, estimateId));

    return NextResponse.json({
      error: false,
      message: "Estimate refreshed with latest data.",
      data: updatedEstimate,
    });
  } catch (e) {
    console.error("[PUT /api/service-tracking/estimates/[id]] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not refresh estimate.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}