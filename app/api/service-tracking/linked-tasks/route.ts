import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { applyLinkedDefaultTasks } from '@/lib/service-tracking/apply-linked-default-tasks';

/** Explicit, authenticated, idempotent catch-up for linked booked-service tasks. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 }); }
  if (!isValidUUID(body?.appointmentId)) return NextResponse.json({ error: true, errorMessage: 'Invalid appointment ID.' }, { status: 422 });
  try {
    const result = await Database.transaction(async tx => {
      const [appointment] = await tx.select({ status: Appointments.status }).from(Appointments)
        .where(eq(Appointments.id, body.appointmentId)).limit(1);
      if (!appointment) return null;
      const phase = appointment.status === 'UNDER_INSPECTION' ? 'INSPECTION' :
        appointment.status === 'IN_PROGRESS' ? 'WORK' : null;
      if (!phase) return { added: 0, phase: null };
      const added = await applyLinkedDefaultTasks(body.appointmentId, phase, tx);
      return { added, phase };
    });
    if (!result) return NextResponse.json({ error: true, errorMessage: 'Appointment not found.' }, { status: 404 });
    return NextResponse.json({ error: false, data: result });
  } catch (error) {
    console.error('[Linked Tasks] Error:', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to attach linked tasks.' }, { status: 500 });
  }
}
