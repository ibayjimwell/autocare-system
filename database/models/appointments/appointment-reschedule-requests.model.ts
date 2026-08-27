import { pgTable, uuid, text, date, time, timestamp, index } from 'drizzle-orm/pg-core';
import { Appointments } from './appointments.model';
import { Customers } from '../customers/customers.model';
import { Staffs } from '../staffs/staffs.model';

export const AppointmentRescheduleRequests = pgTable(
  'appointment_reschedule_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appointmentId: uuid('appointment_id')
      .references(() => Appointments.id, { onDelete: 'cascade' })
      .notNull(),
    requestedBy: text('requested_by').notNull(), // 'customer' or 'staff'
    requestedByCustomerId: uuid('requested_by_customer_id').references(() => Customers.id, { onDelete: 'set null' }),
    requestedByStaffId: uuid('requested_by_staff_id').references(() => Staffs.id, { onDelete: 'set null' }),
    newAppointmentDate: date('new_appointment_date').notNull(),
    newAppointmentTime: time('new_appointment_time').notNull(),
    reason: text('reason'),
    status: text('status').default('PENDING').notNull(), // PENDING, APPROVED, REJECTED, CANCELLED
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    appointmentIdx: index('reschedule_requests_appointment_idx').on(table.appointmentId),
  })
);