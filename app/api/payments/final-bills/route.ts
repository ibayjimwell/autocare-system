// app/api/payments/final-bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { FinalBill } from "@/database/models/payments/final-bill.model";
import { FinalBillFindings } from "@/database/models/payments/final-bill-findings.model";
import { FinalBillFees } from "@/database/models/payments/final-bill-fees.model";
import { FinalBillDiscounts } from "@/database/models/payments/final-bill-discounts.model";
import { FinalBillWorkTasks } from "@/database/models/payments/final-bill-work-tasks.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { eq, and, inArray } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// --------------------------------------------------------------
// GET /api/payments/final-bills – Get final bills with optional filters
// --------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const appointmentId = searchParams.get("appointmentId");
  const customerId = searchParams.get("customerId");

  try {
    // Build filter conditions for FinalBill columns
    const billConditions = [];
    if (status) billConditions.push(eq(FinalBill.status, status));
    if (appointmentId) billConditions.push(eq(FinalBill.appointmentId, appointmentId));

    // Base query selecting all FinalBill columns explicitly
    let query = Database.select({
      id: FinalBill.id,
      appointmentId: FinalBill.appointmentId,
      estimateId: FinalBill.estimateId,
      serviceSubtotal: FinalBill.serviceSubtotal,
      findingsSubtotal: FinalBill.findingsSubtotal,
      workTasksSubtotal: FinalBill.workTasksSubtotal,
      feesTotal: FinalBill.feesTotal,
      discountTotal: FinalBill.discountTotal,
      grandTotal: FinalBill.grandTotal,
      status: FinalBill.status,
      createdAt: FinalBill.createdAt,
      updatedAt: FinalBill.updatedAt,
    }).from(FinalBill);

    // If customerId is provided, join Appointments and Customers to filter
    if (customerId && isValidUUID(customerId)) {
      query = query
        .leftJoin(Appointments, eq(FinalBill.appointmentId, Appointments.id))
        .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
        .where(eq(Customers.id, customerId));

      // Apply additional FinalBill filters if any
      if (billConditions.length > 0) {
        query = query.where(and(...billConditions));
      }
    } else if (billConditions.length > 0) {
      query = query.where(and(...billConditions));
    }

    const bills = await query.orderBy(FinalBill.createdAt);

    // Extract bill IDs for sub-entity queries
    const billIds = bills.map((b) => b.id);
    let findingsMap: Record<string, any[]> = {};
    let feesMap: Record<string, any[]> = {};
    let discountsMap: Record<string, any[]> = {};
    let workTasksMap: Record<string, any[]> = {};

    if (billIds.length > 0) {
      // Findings
      const findings = await Database.select()
        .from(FinalBillFindings)
        .where(inArray(FinalBillFindings.finalBillId, billIds));
      for (const f of findings) {
        if (!findingsMap[f.finalBillId]) findingsMap[f.finalBillId] = [];
        findingsMap[f.finalBillId].push(f);
      }

      // Fees
      const fees = await Database.select()
        .from(FinalBillFees)
        .where(inArray(FinalBillFees.finalBillId, billIds));
      for (const f of fees) {
        if (!feesMap[f.finalBillId]) feesMap[f.finalBillId] = [];
        feesMap[f.finalBillId].push(f);
      }

      // Discounts
      const discounts = await Database.select()
        .from(FinalBillDiscounts)
        .where(inArray(FinalBillDiscounts.finalBillId, billIds));
      for (const d of discounts) {
        if (!discountsMap[d.finalBillId]) discountsMap[d.finalBillId] = [];
        discountsMap[d.finalBillId].push(d);
      }

      // Work Tasks
      const tasks = await Database.select()
        .from(FinalBillWorkTasks)
        .where(inArray(FinalBillWorkTasks.finalBillId, billIds));
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
      { error: false, message: "Final bills retrieved.", data },
      { status: 200 }
    );
  } catch (e) {
    console.error("[GET /api/payments/final-bills] Error:", e);
    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch final bills.",
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}