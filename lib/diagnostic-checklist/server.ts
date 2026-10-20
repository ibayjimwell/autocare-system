import { Database } from '@/lib/drizzle';
import { DiagnosticChecklists } from '@/database/models/diagnostic-checklist/diagnostic-checklists.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { NextResponse } from 'next/server';

export function diagnosticError(message: string, status = 400) {
  return NextResponse.json({ error: true, errorMessage: message }, { status });
}

export async function requireDiagnosticStaff() {
  const session = await getServerSession(authOptions);
  return session?.user?.id
    ? null
    : diagnosticError('Sign in as staff to use diagnostic checklists.', 401);
}

export function validDiagnosticId(id: unknown): id is string {
  return typeof id === 'string' && isValidUUID(id);
}

/**
 * Do not trust a client-side disabled button: the appointment phase can
 * advance while a checklist is open. The API enforces read-only access.
 * COMPLETED is also protected so finished historical checklists stay stable.
 */
export async function requireEditableDiagnosticAppointment(appointmentId: string) {
  const [appointment] = await Database.select({ status: Appointments.status })
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);

  if (!appointment) return diagnosticError('Appointment not found.', 404);

  if (appointment.status === 'IN_PROGRESS' || appointment.status === 'COMPLETED') {
    return diagnosticError(
      'The Diagnostic Checklist is read-only while work is in progress or completed.',
      409,
    );
  }
  return null;
}

export async function getExistingChecklist(appointmentId: string) {
  const [checklist] = await Database.select().from(DiagnosticChecklists)
    .where(eq(DiagnosticChecklists.appointmentId, appointmentId))
    .limit(1);
  return checklist ?? null;
}

export async function ensureChecklist(appointmentId: string) {
  const [appointment] = await Database.select({ id: Appointments.id })
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);
  if (!appointment) return null;
  await Database.insert(DiagnosticChecklists)
    .values({ appointmentId })
    .onConflictDoNothing({ target: DiagnosticChecklists.appointmentId });
  return getExistingChecklist(appointmentId);
}
