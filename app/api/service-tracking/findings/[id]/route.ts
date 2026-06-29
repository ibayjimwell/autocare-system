import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { InspectionFindings } from "@/database/models/service-tracking/inspection-findings.model";
import { InspectionFindingParts } from "@/database/models/service-tracking/inspection-finding-parts.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { recalculateEstimate } from "@/utils/estimates";
import { EstimatedCosts } from "@/database/models";

// ------------------------------------------------------------------
// PUT /api/service-tracking/findings/[id] – Update a finding
// ------------------------------------------------------------------
export async function PUT(
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

  const { description, parts } = body;
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid description",
      errorMessage: "Finding description is required.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    // Update finding description
    const [updated] = await Database.update(InspectionFindings)
      .set({ description: description.trim() })
      .where(eq(InspectionFindings.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Finding not found",
        errorMessage: "Finding does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    // If parts are provided, update them
    if (parts && Array.isArray(parts)) {
      // First, delete existing parts for this finding
      await Database.delete(InspectionFindingParts)
        .where(eq(InspectionFindingParts.findingId, id));

      // Then insert new parts
      for (const part of parts) {
        const partData: any = {
          findingId: id,
          quantity: part.quantity || 1,
          priceAtTime: part.priceAtTime || 0,
          isPms: part.isPms || false,
        };
        if (part.inventoryItemId && isValidUUID(part.inventoryItemId)) {
          partData.inventoryItemId = part.inventoryItemId;
        } else if (part.partName && typeof part.partName === 'string') {
          partData.partName = part.partName.trim();
        } else {
          // Skip if no valid identifier
          continue;
        }
        await Database.insert(InspectionFindingParts).values(partData);
      }
    }

    // Recalculate estimate if one exists for this appointment
    // We need to get the appointmentId from the finding
    const [findingWithAppointment] = await Database.select({
      appointmentId: InspectionFindings.appointmentId,
    })
      .from(InspectionFindings)
      .where(eq(InspectionFindings.id, id));

    if (findingWithAppointment?.appointmentId) {
      // Check if there's an estimate for this appointment
      const [estimate] = await Database.select({ id: EstimatedCosts.id })
        .from(EstimatedCosts)
        .where(eq(EstimatedCosts.appointmentId, findingWithAppointment.appointmentId));
      if (estimate) {
        await recalculateEstimate(estimate.id);
      }
    }

    // Fetch updated finding with parts
    const partsList = await Database.select()
      .from(InspectionFindingParts)
      .where(eq(InspectionFindingParts.findingId, id));

    return NextResponse.json({
      error: false,
      message: "Finding updated.",
      data: {
        ...updated,
        parts: partsList,
      },
    }, { status: 200 });
  } catch (e) {
    console.error("[PUT /api/service-tracking/findings/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update finding.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// DELETE /api/service-tracking/findings/[id] – Delete a finding
// ------------------------------------------------------------------
export async function DELETE(
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
    // Get the appointmentId before deleting
    const [finding] = await Database.select({
      appointmentId: InspectionFindings.appointmentId,
    })
      .from(InspectionFindings)
      .where(eq(InspectionFindings.id, id));

    if (!finding) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Finding not found",
        errorMessage: "Finding does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    // Delete the finding (cascade will delete parts)
    await Database.delete(InspectionFindings)
      .where(eq(InspectionFindings.id, id));

    // Recalculate estimate if one exists
    if (finding.appointmentId) {
      const [estimate] = await Database.select({ id: EstimatedCosts.id })
        .from(EstimatedCosts)
        .where(eq(EstimatedCosts.appointmentId, finding.appointmentId));
      if (estimate) {
        await recalculateEstimate(estimate.id);
      }
    }

    return NextResponse.json({
      error: false,
      message: "Finding deleted.",
    }, { status: 200 });
  } catch (e) {
    console.error("[DELETE /api/service-tracking/findings/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database deletion error",
      errorMessage: "Could not delete finding.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}