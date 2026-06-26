import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { EstimateFees } from "@/database/models/payments/estimate-fees.model";
import { EstimateDiscounts } from "@/database/models/payments/estimate-discounts.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq, sql } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

export async function GET(
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
    const [estimate] = await Database.select({
      id: EstimatedCosts.id,
      appointmentId: EstimatedCosts.appointmentId,
      status: EstimatedCosts.status,
      serviceSubtotal: EstimatedCosts.serviceSubtotal,
      findingsSubtotal: EstimatedCosts.findingsSubtotal,
      feesTotal: EstimatedCosts.feesTotal,
      discountTotal: EstimatedCosts.discountTotal,
      grandTotal: EstimatedCosts.grandTotal,
      reason: EstimatedCosts.reason,
      createdAt: EstimatedCosts.createdAt,
      updatedAt: EstimatedCosts.updatedAt,
      appointment: {
        id: Appointments.id,
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
      .from(EstimatedCosts)
      .leftJoin(Appointments, eq(EstimatedCosts.appointmentId, Appointments.id))
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
      .where(eq(EstimatedCosts.id, id));

    if (!estimate) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Estimate not found",
        errorMessage: "Estimate does not exist.",
        errorLog: null,
      }, { status: 404 });
    }

    // Fetch findings with parts
    const findings = await Database.select()
      .from(EstimateFindings)
      .where(eq(EstimateFindings.estimateId, id));
    const findingIds = findings.map(f => f.id);
    let partsMap: Record<string, any[]> = {};
    if (findingIds.length > 0) {
      const parts = await Database.select()
        .from(EstimateFindingParts)
        .where(sql`${EstimateFindingParts.estimateFindingId} IN (${findingIds.join(',')})`);
      for (const p of parts) {
        if (!partsMap[p.estimateFindingId]) partsMap[p.estimateFindingId] = [];
        partsMap[p.estimateFindingId].push(p);
      }
    }

    const findingsWithParts = findings.map(f => ({
      ...f,
      parts: partsMap[f.id] || [],
    }));

    // Fetch fees and discounts
    const fees = await Database.select()
      .from(EstimateFees)
      .where(eq(EstimateFees.estimateId, id));
    const discounts = await Database.select()
      .from(EstimateDiscounts)
      .where(eq(EstimateDiscounts.estimateId, id));

    return NextResponse.json({
      error: false,
      message: "Estimate retrieved.",
      data: {
        ...estimate,
        findings: findingsWithParts,
        fees,
        discounts,
      },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/payments/estimates/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch estimate.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}