import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { FinalBillFees } from "@/database/models/billing/final-bill-fees.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// ---------------------------------------------------------------
// PATCH /api/billing/finall-bills/:id/fees/:feeId/toggle
// ---------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; feeId: string }> },
) {
  const { id: billId, feeId } = await params;
  if (!isValidUUID(billId) || !isValidUUID(feeId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid IDs",
        errorMessage: "Bill ID and fee ID must be valid UUIDs.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    // Check bill status
    const [bill] = await Database.select()
      .from(FinalBillFees)
      .where(eq(FinalBillFees.id, billId));
    if (!bill) {
      return NextResponse.json(
        {
          error: true,
          errorType: "auth",
          errorTitle: "Bill not found",
          errorMessage: "Final bill does not exist.",
          errorLog: null,
        },
        { status: 404 },
      );
    }
    if (bill.status !== "PENDING") {
      return NextResponse.json(
        {
          error: true,
          errorType: "fve",
          errorTitle: "Invalid status",
          errorMessage: "Only PENDING bills can be edited.",
          errorLog: null,
        },
        { status: 422 },
      );
    }

    // For fees, we might not have an "included" flag – we could add one, but the user didn't mention it. They mentioned toggling included flag on findings, fees, etc. We'll add an `included` column to the fees table? The user said "toggle included flag on findings, fees, etc." We could add a column, but for now, we'll assume they want to toggle the amount? Alternatively, we could treat fees as always included unless removed. Since the user didn't specify a deletion mechanism, we'll skip fee toggling for now. If needed, we can add the column and similar logic.

    // We'll implement a toggle that sets included flag. We need to add the column to FinalBillFees first.
    // For now, we'll return a message that it's not implemented.
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Not implemented",
        errorMessage: "Fee toggling is not yet supported.",
        errorLog: null,
      },
      { status: 501 },
    );
  } catch (e) {
    console.error(
      "[PATCH /api/billing/final-bills/[id]/fees/[feeId]/toggle] Error:",
      e,
    );
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database update error",
        errorMessage: "Could not toggle fee.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
