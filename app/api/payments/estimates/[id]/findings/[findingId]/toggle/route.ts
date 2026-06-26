import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { recalculateEstimate } from "@/utils/estimates";

// ----------------------------------------------------------------
// PATCH /api/payments/estimates/:id/findings/:findingId/toggle
// ----------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> },
) {
  const { id: estimateId, findingId } = await params;
  if (!isValidUUID(estimateId) || !isValidUUID(findingId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid IDs",
        errorMessage: "Estimate ID and finding ID must be valid UUIDs.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    // Check estimate status – can only toggle if WAITING_FOR_APPROVAL
    const [estimate] = await Database.select()
      .from(EstimatedCosts)
      .where(eq(EstimatedCosts.id, estimateId));
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
            "Findings can only be toggled when estimate is WAITING_FOR_APPROVAL.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    const [estFinding] = await Database.select()
      .from(EstimateFindings)
      .where(
        and(
          eq(EstimateFindings.estimateId, estimateId),
          eq(EstimateFindings.findingId, findingId),
        ),
      );
    if (!estFinding) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Finding not found",
          errorMessage: "Finding not associated with this estimate.",
          errorLog: null,
        },
        { status: 404 },
      );
    }

    // Toggle included
    await Database.update(EstimateFindings)
      .set({ included: !estFinding.included })
      .where(eq(EstimateFindings.id, estFinding.id));

    // Recalculate estimate totals
    await recalculateEstimate(estimateId);

    return NextResponse.json(
      {
        error: false,
        message: "Finding toggled.",
      },
      { status: 200 },
    );
  } catch (e) {
    console.error(
      "[PATCH /api/service-tracking/estimates/[id]/findings/[findingId]/toggle] Error:",
      e,
    );
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database update error",
        errorMessage: "Could not toggle finding.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
