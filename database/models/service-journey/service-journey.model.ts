import { pgTable, uuid, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';
export const ServiceDelays = pgTable('service_delays', {
  appointmentId: uuid('appointment_id').primaryKey().references(() => Appointments.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  expectedReadyAt: timestamp('expected_ready_at', { withTimezone: true }),
  reportedBy: uuid('reported_by'),
  reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const ServiceWarranties = pgTable('service_warranties', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id').notNull().unique().references(() => Appointments.id, { onDelete: 'cascade' }),
  coverage: text('coverage').notNull(),
  terms: text('terms').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const ServiceProgressSMS = pgTable('service_progress_sms', {
  appointmentId: uuid('appointment_id').notNull().references(() => Appointments.id, { onDelete: 'cascade' }),
  intervalBucket: timestamp('interval_bucket', { withTimezone: true }).notNull(),
  status: text('status').default('CLAIMED').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  lastError: text('last_error'),
}, table => ({ key: primaryKey({ columns: [table.appointmentId, table.intervalBucket] }), statusIndex: index('service_progress_sms_status_idx').on(table.status, table.attemptedAt) }));

import { FinalBill } from '../payments/final-bill.model';
import { Customers } from '../customers/customers.model';
export const CashCounterCheckins=pgTable('cash_counter_checkins',{
  billId:uuid('bill_id').primaryKey().references(()=>FinalBill.id,{onDelete:'cascade'}),
  customerId:uuid('customer_id').notNull().references(()=>Customers.id),
  scannedAt:timestamp('scanned_at',{withTimezone:true}).defaultNow().notNull(),
});
