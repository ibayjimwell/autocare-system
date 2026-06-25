import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';

export const EstimatedCosts = pgTable('estimated_costs', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id').references(() => Appointments.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, WAITING_FOR_APPROVAL, APPROVED, DECLINED
  serviceSubtotal: decimal('service_subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
  findingsSubtotal: decimal('findings_subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
  feesTotal: decimal('fees_total', { precision: 10, scale: 2 }).default('0').notNull(),
  discountTotal: decimal('discount_total', { precision: 10, scale: 2 }).default('0').notNull(),
  grandTotal: decimal('grand_total', { precision: 10, scale: 2 }).default('0').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appointmentIdx: index('estimated_costs_appointment_idx').on(table.appointmentId),
}));