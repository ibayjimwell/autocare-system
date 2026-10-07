import { Database } from '@/lib/drizzle';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { eq } from 'drizzle-orm';

export async function getAppointmentInfo(appointmentId: string) {
  const [row] = await Database
    .select({
      trackingNumber: Appointments.trackingNumber,
      customerId: Appointments.customerId,
      customerName: Customers.fullname,
    })
    .from(Appointments)
    .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
    .where(eq(Appointments.id, appointmentId))
    .limit(1);

  return {
    trackingNumber: row?.trackingNumber || 'N/A',
    customerId: row?.customerId || '',
    customerName: row?.customerName || undefined,
  };
}