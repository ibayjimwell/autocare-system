// app/api/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { ServiceQueue } from "@/database/models/queue/service-queue.model";
import { Customers } from "@/database/models/customers/customers.model";
import { Vehicles } from "@/database/models/customers/vehicles.model";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({
      error: true,
      errorMessage: 'Valid date (YYYY-MM-DD) is required.',
    }, { status: 400 });
  }

  try {
    // Only read existing queue entries – no write operations
    const queue = await Database.select({
      queueId: ServiceQueue.id,
      appointmentId: ServiceQueue.appointmentId,
      queueNumber: ServiceQueue.queueNumber,
      queueStatus: ServiceQueue.status,
      appointmentDate: Appointments.appointmentDate,
      appointmentTime: Appointments.appointmentTime,
      trackingNumber: Appointments.trackingNumber,
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
      services: Appointments.services,
    })
      .from(ServiceQueue)
      .innerJoin(Appointments, eq(ServiceQueue.appointmentId, Appointments.id))
      .innerJoin(Customers, eq(Appointments.customerId, Customers.id))
      .innerJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
      .where(eq(ServiceQueue.queueDate, date))
      .orderBy(ServiceQueue.queueNumber);

    return NextResponse.json({
      error: false,
      message: "Queue retrieved.",
      data: queue,
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/service-queue] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database error",
      errorMessage: "Unable to fetch queue.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}