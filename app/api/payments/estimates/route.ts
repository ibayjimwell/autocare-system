// app/api/payments/estimates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const appointmentId = searchParams.get('appointmentId');
  const customerId = searchParams.get('customerId');   // NEW

  try {
    const conditions = [];

    if (status) conditions.push(eq(EstimatedCosts.status, status.toUpperCase()));
    if (appointmentId && isValidUUID(appointmentId)) {
      conditions.push(eq(EstimatedCosts.appointmentId, appointmentId));
    }
    if (customerId && isValidUUID(customerId)) {
      conditions.push(eq(Customers.id, customerId));
    }

    let query = Database.select({
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
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const estimates = await query.orderBy(EstimatedCosts.createdAt);

    return NextResponse.json({
      error: false,
      message: "Estimates retrieved.",
      data: estimates,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/payments/estimates] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch estimates.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}