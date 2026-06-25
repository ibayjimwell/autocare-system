import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { FinalBillFindings } from "@/database/models/billing/final-bill-findings.model";
import { FinalBill } from "@/database/models/billing/final-bill.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
// We'll need a helper to recalculate final bill totals. For simplicity, we'll implement a simple recalculation here or import from a utils file.

// ---------------------------------------------------------------
// PATCH /api/billing/finall-bills/:id/findings/:findingId/toggle
// ---------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const { id: billId, findingId } = await params;
  if (!isValidUUID(billId) || !isValidUUID(findingId)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid IDs",
      errorMessage: "Bill ID and finding ID must be valid UUIDs.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    // Check if bill exists and is PENDING
    const [bill] = await Database.select()
      .from(FinalBill)
      .where(eq(FinalBill.id, billId));
    if (!bill) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Bill not found",
        errorMessage: "Final bill does not exist.",
        errorLog: null,
      }, { status: 404 });
    }
    if (bill.status !== 'PENDING') {
      return NextResponse.json({
        error: true,
        errorType: "fve",
        errorTitle: "Invalid status",
        errorMessage: "Only PENDING bills can be edited.",
        errorLog: null,
      }, { status: 422 });
    }

    const [finding] = await Database.select()
      .from(FinalBillFindings)
      .where(
        and(
          eq(FinalBillFindings.finalBillId, billId),
          eq(FinalBillFindings.id, findingId)
        )
      );
    if (!finding) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Finding not found",
        errorMessage: "Finding not associated with this bill.",
        errorLog: null,
      }, { status: 404 });
    }

    // Toggle included
    await Database.update(FinalBillFindings)
      .set({ included: !finding.included })
      .where(eq(FinalBillFindings.id, findingId));

    // Recalculate final bill totals (simple version)
    // We'll fetch all findings (included only) and sum their partsSubtotal
    const allFindings = await Database.select()
      .from(FinalBillFindings)
      .where(eq(FinalBillFindings.finalBillId, billId));
    const findingsSubtotal = allFindings
      .filter(f => f.included)
      .reduce((sum, f) => sum + parseFloat(f.partsSubtotal), 0);

    // Also recalculate fees, discounts, and serviceSubtotal, workTasksSubtotal (if needed)
    // For simplicity, we keep serviceSubtotal and workTasksSubtotal unchanged (they don't have included flag)
    // Fees are also not toggled yet – only findings.
    // We'll just update findingsSubtotal and grandTotal.
    const feesTotal = parseFloat(bill.feesTotal);
    const serviceSubtotal = parseFloat(bill.serviceSubtotal);
    const workTasksSubtotal = parseFloat(bill.workTasksSubtotal);
    const discountTotal = parseFloat(bill.discountTotal);
    const grandTotal = serviceSubtotal + findingsSubtotal + feesTotal + workTasksSubtotal - discountTotal;

    await Database.update(FinalBill)
      .set({
        findingsSubtotal: findingsSubtotal.toString(),
        grandTotal: grandTotal.toString(),
        updatedAt: new Date(),
      })
      .where(eq(FinalBill.id, billId));

    return NextResponse.json({
      error: false,
      message: "Finding toggled.",
    }, { status: 200 });
  } catch (e) {
    console.error("[PATCH /api/billing/final-bills/[id]/findings/[findingId]/toggle] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not toggle finding.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}