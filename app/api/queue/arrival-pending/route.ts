import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { ServiceQueue } from '@/database/models/queue/service-queue.model';
import { Vehicles } from '@/database/models/customers/vehicles.model';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { and, eq, isNull, lt, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** Only a verified customer may see their own outstanding arrival requests. */
export async function GET(req: NextRequest) {
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  }
  try {
    const now = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const rows = await Database.select({
      appointmentId: Appointments.id,
      trackingNumber: Appointments.trackingNumber,
      appointmentDate: Appointments.appointmentDate,
      requestAt: ServiceQueue.arrivalRequestAt,
      vehicleMake: Vehicles.make,
      vehicleModel: Vehicles.model,
      vehicleYear: Vehicles.year,
      plateNumber: Vehicles.plateNumber,
    }).from(ServiceQueue)
      .innerJoin(Appointments, eq(ServiceQueue.appointmentId, Appointments.id))
      .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
      .where(and(
        eq(Appointments.customerId, customerId),
        eq(Appointments.status, 'CONFIRMED'),
        eq(Appointments.appointmentDate, now),
        or(eq(ServiceQueue.status, 'PENDING'), eq(ServiceQueue.status, 'ARRIVING'), eq(ServiceQueue.status, 'NOT_ARRIVED')),
        or(isNull(ServiceQueue.arrivalResponseAt), lt(ServiceQueue.arrivalResponseAt, ServiceQueue.arrivalRequestAt)),
      ));
    const data = rows.filter(row => row.requestAt && row.appointmentDate === now)
      .map(row => ({...row, requestAt: row.requestAt!.toISOString()}))
      .sort((a, b) => a.requestAt.localeCompare(b.requestAt));
    return NextResponse.json({ error: false, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[arrival-pending] Failed:', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to fetch arrival requests.' }, { status: 500 });
  }
}
