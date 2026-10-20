import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq } from 'drizzle-orm';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { customerChangeWindow } from '@/lib/appointments/customer-change-window';
import { isValidUUID } from '@/utils/shared';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid appointment.' }, { status: 422 });
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  const [appointment] = await Database.select().from(Appointments).where(eq(Appointments.id, id)).limit(1);
  if (!appointment || appointment.customerId !== customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Appointment not found.' }, { status: 404 });
  }
  const data = await customerChangeWindow(appointment);
  return NextResponse.json({ error: false, data });
}
