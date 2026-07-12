import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { eq } from 'drizzle-orm';

export async function getTrackingNumber(appointmentId: string): Promise<string> {
  const [appt] = await Database.select({ trackingNumber: Appointments.trackingNumber })
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId))
    .limit(1);
  return appt?.trackingNumber || 'N/A';
}