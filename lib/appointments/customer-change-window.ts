import { Database } from '@/lib/drizzle';
import { AppointmentStatusHistory } from '@/database/models/appointments/appointments-status-history.model';
import { and, asc, eq } from 'drizzle-orm';

const CONFIRMED_GRACE_MS = 24 * 60 * 60 * 1000;
const MINIMUM_LEAD_MS = 2 * 60 * 60 * 1000;

/** Philippine civil appointmentDate + appointmentTime -> absolute UTC instant. */
export function appointmentStartMs(appointment: { appointmentDate: string; appointmentTime: string }) {
  const day = String(appointment.appointmentDate || '').slice(0, 10);
  const time = String(appointment.appointmentTime || '').slice(0, 8);
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !match) return NaN;
  return Date.parse(`${day}T${match[1]}:${match[2]}:${match[3] || '00'}+08:00`);
}

/** Staff can still manage exceptions; customer-facing Confirmed changes have a strict deadline. */
export async function customerChangeWindow(
  appointment: { id: string; status: string; appointmentDate: string; appointmentTime: string; createdAt: Date },
  db: any = Database,
) {
  if (appointment.status !== 'CONFIRMED') {
    return { allowed: appointment.status === 'PENDING', deadline: null, reason: appointment.status === 'PENDING'
      ? null : 'Customer changes are unavailable at this stage.' };
  }
  const history = await db.select({ createdAt: AppointmentStatusHistory.createdAt })
    .from(AppointmentStatusHistory)
    .where(and(eq(AppointmentStatusHistory.appointmentId, appointment.id), eq(AppointmentStatusHistory.toStatus, 'CONFIRMED')))
    .orderBy(asc(AppointmentStatusHistory.createdAt)).limit(1);
  // Historical appointments with no confirmation audit use their creation date;
  // never infer a later confirmation from unrelated appointment.updatedAt changes.
  const confirmedAt = new Date(history[0]?.createdAt || appointment.createdAt).getTime();
  const startsAt = appointmentStartMs(appointment);
  if (!Number.isFinite(startsAt) || !Number.isFinite(confirmedAt)) {
    return { allowed: false, deadline: null, reason: 'Unable to verify the booking change deadline. Contact the service center.' };
  }
  const deadline = Math.min(confirmedAt + CONFIRMED_GRACE_MS, startsAt - MINIMUM_LEAD_MS);
  const allowed = Date.now() < deadline;
  return {
    allowed,
    deadline: new Date(deadline).toISOString(),
    reason: allowed ? null : 'The change window has closed. Contact Auto Pro Tech to reschedule or cancel.',
  };
}
