import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { FinalBill } from "@/database/models/payments/final-bill.model";
import { FinalBillFindings } from "@/database/models/payments/final-bill-findings.model";
import { FinalBillFees } from "@/database/models/payments/final-bill-fees.model";
import { FinalBillDiscounts } from "@/database/models/payments/final-bill-discounts.model";
import { FinalBillWorkTasks } from "@/database/models/payments/final-bill-work-tasks.model";
import { eq, sql } from "drizzle-orm";

// --------------------------------------------------------------
// GET /api/payments/finall-bills?status=...&appointmentId=...
// --------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const appointmentId = searchParams.get("appointmentId");

  try {
    let query = Database.select().from(FinalBill);
    if (status) query = query.where(eq(FinalBill.status, status));
    if (appointmentId)
      query = query.where(eq(FinalBill.appointmentId, appointmentId));
    const bills = await query.orderBy(FinalBill.createdAt);

    // Fetch associated items for each bill
    const billIds = bills.map((b) => b.id);
    let findingsMap: Record<string, any[]> = {};
    let feesMap: Record<string, any[]> = {};
    let discountsMap: Record<string, any[]> = {};
    let workTasksMap: Record<string, any[]> = {};

    if (billIds.length > 0) {
      // Findings
      const findings = await Database.select()
        .from(FinalBillFindings)
        .where(sql`${FinalBillFindings.finalBillId} IN (${billIds.join(",")})`);
      for (const f of findings) {
        if (!findingsMap[f.finalBillId]) findingsMap[f.finalBillId] = [];
        findingsMap[f.finalBillId].push(f);
      }
      // Fees
      const fees = await Database.select()
        .from(FinalBillFees)
        .where(sql`${FinalBillFees.finalBillId} IN (${billIds.join(",")})`);
      for (const f of fees) {
        if (!feesMap[f.finalBillId]) feesMap[f.finalBillId] = [];
        feesMap[f.finalBillId].push(f);
      }
      // Discounts
      const discounts = await Database.select()
        .from(FinalBillDiscounts)
        .where(
          sql`${FinalBillDiscounts.finalBillId} IN (${billIds.join(",")})`,
        );
      for (const d of discounts) {
        if (!discountsMap[d.finalBillId]) discountsMap[d.finalBillId] = [];
        discountsMap[d.finalBillId].push(d);
      }
      // Work Tasks
      const tasks = await Database.select()
        .from(FinalBillWorkTasks)
        .where(
          sql`${FinalBillWorkTasks.finalBillId} IN (${billIds.join(",")})`,
        );
      for (const t of tasks) {
        if (!workTasksMap[t.finalBillId]) workTasksMap[t.finalBillId] = [];
        workTasksMap[t.finalBillId].push(t);
      }
    }

    const data = bills.map((b) => ({
      ...b,
      findings: findingsMap[b.id] || [],
      fees: feesMap[b.id] || [],
      discounts: discountsMap[b.id] || [],
      workTasks: workTasksMap[b.id] || [],
    }));

    return NextResponse.json(
      {
        error: false,
        message: "Final bills retrieved.",
        data,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/billing/final-bills] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch final bills.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
