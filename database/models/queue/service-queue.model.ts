// database/models/service-tracking/service-queue.model.ts
import { pgTable, uuid, integer, date, timestamp, text } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';

export const ServiceQueue = pgTable('service_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id')
    .references(() => Appointments.id, { onDelete: 'cascade' })
    .notNull(),
  queueDate: date('queue_date').notNull(),      // date of service
  queueNumber: integer('queue_number').notNull(), // 1,2,3...
  status: text('status').default('WAITING').notNull(), // WAITING, SERVING, COMPLETED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});