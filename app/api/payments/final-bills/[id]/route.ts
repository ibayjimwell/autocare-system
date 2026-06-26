import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { FinalBill } from "@/database/models/payments/final-bill.model";
import { FinalBillFindings } from "@/database/models/payments/final-bill-findings.model";
import { FinalBillFindingParts } from "@/database/models/payments/final-bill-finding-parts.model";
import { FinalBillFees } from "@/database/models/payments/final-bill-fees.model";
import { FinalBillDiscounts } from "@/database/models/payments/final-bill-discounts.model";
import { FinalBillWorkTasks } from "@/database/models/payments/final-bill-work-tasks.model";
import { eq, sql } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// ---------------------------------------------------------------
// GET /api/payments/finall-bills/:id
// ---------------------------------------------------------------
export async function GET(
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

  try {
    const [bill] = await Database.select()
      .from(FinalBill)
      .where(eq(FinalBill.id, id));
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

    // Fetch associated items
    const findings = await Database.select()
      .from(FinalBillFindings)
      .where(eq(FinalBillFindings.finalBillId, id));
    const fees = await Database.select()
      .from(FinalBillFees)
      .where(eq(FinalBillFees.finalBillId, id));
    const discounts = await Database.select()
      .from(FinalBillDiscounts)
      .where(eq(FinalBillDiscounts.finalBillId, id));
    const workTasks = await Database.select()
      .from(FinalBillWorkTasks)
      .where(eq(FinalBillWorkTasks.finalBillId, id));

    // Fetch parts for findings
    const findingIds = findings.map((f) => f.id);
    let partsMap: Record<string, any[]> = {};
    if (findingIds.length > 0) {
      const parts = await Database.select()
        .from(FinalBillFindingParts)
        .where(
          eq(FinalBillFindingParts.finalBillFindingId, sql`ANY(${findingIds})`),
        );
      for (const p of parts) {
        if (!partsMap[p.finalBillFindingId])
          partsMap[p.finalBillFindingId] = [];
        partsMap[p.finalBillFindingId].push(p);
      }
    }

    const findingsWithParts = findings.map((f) => ({
      ...f,
      parts: partsMap[f.id] || [],
    }));

    return NextResponse.json(
      {
        error: false,
        message: "Final bill retrieved.",
        data: {
          ...bill,
          findings: findingsWithParts,
          fees,
          discounts,
          workTasks,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/billing/final-bills/[id]] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch final bill.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
