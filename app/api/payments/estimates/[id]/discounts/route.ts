import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimateDiscounts } from "@/database/models/payments/estimate-discounts.model";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { recalculateEstimate } from "@/utils/estimates";

// ------------------------------------------------------------------------------
// POST /api/payments/estimates/:id/discounts
// ------------------------------------------------------------------------------
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

  const { title, type, value } = body;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Title required",
        errorMessage: "Discount title is required.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  if (!type || !["fixed", "percentage"].includes(type)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid type",
        errorMessage: "Type must be 'fixed' or 'percentage'.",
        errorLog: null,
      },
      { status: 422 },
    );
  }
  if (
    value === undefined ||
    isNaN(parseFloat(value)) ||
    parseFloat(value) < 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid value",
        errorMessage: "Value must be a non-negative number.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
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
            "Discounts can only be added to PENDING or WAITING_FOR_APPROVAL estimates.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    await Database.insert(EstimateDiscounts).values({
      estimateId,
      title: title.trim(),
      type,
      value: parseFloat(value).toString(),
      amount: "0", // will be recalculated
    });

    await recalculateEstimate(estimateId);

    return NextResponse.json(
      {
        error: false,
        message: "Discount added.",
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/billing/estimates/[id]/discounts] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Could not add discount.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
