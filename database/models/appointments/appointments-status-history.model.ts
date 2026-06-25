import { pgTable, uuid, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { Appointments } from './appointments.model';
import { Staffs } from '../staffs/staffs.model';
import { AppointmentStatusEnum } from './enum/appointments-status.enum';

export const AppointmentStatusHistory = pgTable('appointment_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id').references(() => Appointments.id).notNull(),
  fromStatus: AppointmentStatusEnum('from_status'),
  toStatus: AppointmentStatusEnum('to_status').notNull(),
  changedBy: uuid('changed_by').references(() => Staffs.id).notNull(),
  metadata: jsonb('metadata'), // optional extra fields (e.g., reason, confirm_date, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
