
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";

import { FinalBill } from "@/database/models/payments/final-bill.model";
import { FinalBillFindings } from "@/database/models/payments/final-bill-findings.model";
import { FinalBillFees } from "@/database/models/payments/final-bill-fees.model";
import { FinalBillDiscounts } from "@/database/models/payments/final-bill-discounts.model";
import { FinalBillWorkTasks } from "@/database/models/payments/final-bill-work-tasks.model";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";

import {
  eq,
  and,
  inArray,
  asc,
  type SQL,
} from "drizzle-orm";

import { isValidUUID } from "@/utils/shared";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const appointmentId = searchParams.get("appointmentId");
  const customerId = searchParams.get("customerId");

  if (appointmentId && !isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: "Invalid appointment ID.",
      },
      { status: 400 }
    );
  }

  if (customerId && !isValidUUID(customerId)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: "Invalid customer ID.",
      },
      { status: 400 }
    );
  }

  try {
    const conditions: SQL[] = [];

    if (status) {
      conditions.push(
        eq(FinalBill.status, status.toUpperCase())
      );
    }

    if (appointmentId) {
      conditions.push(
        eq(FinalBill.appointmentId, appointmentId)
      );
    }

    if (customerId) {
      conditions.push(
        eq(Customers.id, customerId)
      );
    }

    const query = Database
      .select({
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

        // Estimate data required by FinalBillCard.
        estimate: {
          id: EstimatedCosts.id,
          grandTotal: EstimatedCosts.grandTotal,
          status: EstimatedCosts.status,
          createdAt: EstimatedCosts.createdAt,
          updatedAt: EstimatedCosts.updatedAt,
        },

        // Appointment data required by FinalBillCard.
        appointment: {
          id: Appointments.id,
          trackingNumber: Appointments.trackingNumber,
          appointmentDate: Appointments.appointmentDate,
          appointmentTime: Appointments.appointmentTime,

          customer: {
            id: Customers.id,
            fullname: Customers.fullname,
            email: Customers.email,
            phone: Customers.phone,
          },

          vehicle: {
            id: Vehicles.id,
            make: Vehicles.make,
            model: Vehicles.model,
            year: Vehicles.year,
            plateNumber: Vehicles.plateNumber,
          },
        },
      })
      .from(FinalBill)
      .leftJoin(
        EstimatedCosts,
        eq(FinalBill.estimateId, EstimatedCosts.id)
      )
      .leftJoin(
        Appointments,
        eq(FinalBill.appointmentId, Appointments.id)
      )
      .leftJoin(
        Customers,
        eq(Appointments.customerId, Customers.id)
      )
      .leftJoin(
        Vehicles,
        eq(Appointments.vehicleId, Vehicles.id)
      )
      .$dynamic();

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const bills = await query.orderBy(
      asc(FinalBill.createdAt)
    );

    const billIds = bills.map((bill) => bill.id);

    const findingsMap: Record<string, any[]> = {};
    const feesMap: Record<string, any[]> = {};
    const discountsMap: Record<string, any[]> = {};
    const workTasksMap: Record<string, any[]> = {};

    if (billIds.length > 0) {
      const [
        findings,
        fees,
        discounts,
        workTasks,
      ] = await Promise.all([
        Database
          .select()
          .from(FinalBillFindings)
          .where(
            inArray(
              FinalBillFindings.finalBillId,
              billIds
            )
          ),

        Database
          .select()
          .from(FinalBillFees)
          .where(
            inArray(
              FinalBillFees.finalBillId,
              billIds
            )
          ),

        Database
          .select()
          .from(FinalBillDiscounts)
          .where(
            inArray(
              FinalBillDiscounts.finalBillId,
              billIds
            )
          ),

        Database
          .select()
          .from(FinalBillWorkTasks)
          .where(
            inArray(
              FinalBillWorkTasks.finalBillId,
              billIds
            )
          ),
      ]);

      for (const finding of findings) {
        if (!findingsMap[finding.finalBillId]) {
          findingsMap[finding.finalBillId] = [];
        }

        findingsMap[finding.finalBillId].push(finding);
      }

      for (const fee of fees) {
        if (!feesMap[fee.finalBillId]) {
          feesMap[fee.finalBillId] = [];
        }

        feesMap[fee.finalBillId].push(fee);
      }

      for (const discount of discounts) {
        if (!discountsMap[discount.finalBillId]) {
          discountsMap[discount.finalBillId] = [];
        }

        discountsMap[discount.finalBillId].push(discount);
      }

      for (const task of workTasks) {
        if (!workTasksMap[task.finalBillId]) {
          workTasksMap[task.finalBillId] = [];
        }

        workTasksMap[task.finalBillId].push(task);
      }
    }

    const data = bills.map((bill) => ({
      ...bill,

      findings: findingsMap[bill.id] || [],
      fees: feesMap[bill.id] || [],
      discounts: discountsMap[bill.id] || [],
      workTasks: workTasksMap[bill.id] || [],
    }));

    return NextResponse.json(
      {
        error: false,
        message: "Final Costs retrieved.",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[GET /api/payments/final-bills] Error:",
      error
    );

    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch Final Costs.",
      },
      { status: 500 }
    );
  }
}
