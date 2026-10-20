import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { DiagnosticChecklists, DiagnosticChecklistEntries } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { DIAGNOSTIC_SECTIONS } from '@/lib/diagnostic-checklist/catalog';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { isValidUUID } from '@/utils/shared';

/** Customer read-only checklist: private to appointment owner, never exposes mutation endpoints. */
export async function GET(req: NextRequest) {
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  const appointmentId = new URL(req.url).searchParams.get('appointmentId');
  if (!isValidUUID(appointmentId)) return NextResponse.json({ error: true, errorMessage: 'Invalid appointment.' }, { status: 422 });
  try {
    const [appointment] = await Database.select({ customerId: Appointments.customerId }).from(Appointments)
      .where(eq(Appointments.id, appointmentId!)).limit(1);
    if (!appointment || appointment.customerId !== customerId)
      return NextResponse.json({ error: true, errorMessage: 'Appointment not found.' }, { status: 404 });
    const [checklist] = await Database.select().from(DiagnosticChecklists)
      .where(eq(DiagnosticChecklists.appointmentId, appointmentId!)).limit(1);
    const entries = checklist ? await Database.select().from(DiagnosticChecklistEntries)
      .where(eq(DiagnosticChecklistEntries.checklistId, checklist.id)) : [];
    return NextResponse.json({ error: false, data: { checklist: checklist || null, entries, sections: DIAGNOSTIC_SECTIONS } },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Customer diagnostic checklist]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to load checklist.' }, { status: 500 });
  }
}
