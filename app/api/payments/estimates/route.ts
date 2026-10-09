
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq, and, asc, type SQL } from "drizzle-orm";
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
        eq(EstimatedCosts.status, status.toUpperCase())
      );
    }

    if (appointmentId) {
      conditions.push(
        eq(EstimatedCosts.appointmentId, appointmentId)
      );
    }

    if (customerId) {
      conditions.push(
        eq(Customers.id, customerId)
      );
    }

    const query = Database
      .select({
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

          // Required by EstimateCard.
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
      .from(EstimatedCosts)
      .leftJoin(
        Appointments,
        eq(EstimatedCosts.appointmentId, Appointments.id)
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

    const estimates = await query.orderBy(
      asc(EstimatedCosts.createdAt)
    );

    return NextResponse.json(
      {
        error: false,
        message: "Estimates retrieved.",
        data: estimates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[GET /api/payments/estimates] Error:",
      error
    );

    return NextResponse.json(
      {
        error: true,
        errorType: "dbe",
        errorTitle: "Database error",
        errorMessage: "Unable to fetch estimates.",
      },
      { status: 500 }
    );
  }
}
