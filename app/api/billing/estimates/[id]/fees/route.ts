import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimateFees } from "@/database/models/billing/estimate-fees.model";
import { EstimatedCosts } from "@/database/models/billing/estimated-costs.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { recalculateEstimate } from "@/utils/estimates";

// ----------------------------------------------------------------
// POST /api/billing/estimates/:id/fees
// ----------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: estimateId } = await params;
  if (!isValidUUID(estimateId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid estimate ID",
        errorMessage: "Estimate ID must be a valid UUID.",
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

  const { title, amount, findingId } = body;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Title required",
        errorMessage: "Fee title is required.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  if (
    amount === undefined ||
    isNaN(parseFloat(amount)) ||
    parseFloat(amount) < 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid amount",
        errorMessage: "Amount must be a non-negative number.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  if (findingId && !isValidUUID(findingId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid finding ID",
        errorMessage: "findingId must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    // Check estimate exists and status allows adding fees (PENDING or WAITING_FOR_APPROVAL)
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
    if (
      estimate.status !== "PENDING" &&
      estimate.status !== "WAITING_FOR_APPROVAL"
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Invalid status",
          errorMessage:
            "Fees can only be added to PENDING or WAITING_FOR_APPROVAL estimates.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    await Database.insert(EstimateFees).values({
      estimateId,
      title: title.trim(),
      amount: parseFloat(amount).toString(),
      findingId: findingId || null,
    });

    // Recalculate totals
    await recalculateEstimate(estimateId);

    return NextResponse.json(
      {
        error: false,
        message: "Fee added.",
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/billing/estimates/[id]/fees] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not add fee.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
