import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';

export const TaskHistory = pgTable(
  'task_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appointmentId: uuid('appointment_id')
      .references(() => Appointments.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    durationMinutes: integer('duration_minutes'),
    phase: text('phase').notNull(), // 'INSPECTION' or 'WORK'
    completedAt: timestamp('completed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    appointmentIdx: index('task_history_appointment_idx').on(table.appointmentId),
    phaseIdx: index('task_history_phase_idx').on(table.phase),
  })
);