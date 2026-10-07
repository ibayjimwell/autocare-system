import { pgTable, uuid, varchar, decimal, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';
import { Staffs } from '../staffs/staffs.model';

export const PaymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: uuid('entity_id'),
    appointmentId: uuid('appointment_id').references(() => Appointments.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    fromStatus: varchar('from_status', { length: 32 }),
    toStatus: varchar('to_status', { length: 32 }),
    amount: decimal('amount', { precision: 12, scale: 2 }),
    paymentMethod: varchar('payment_method', { length: 40 }),
    referenceNumber: varchar('reference_number', { length: 80 }),
    actorStaffId: uuid('actor_staff_id').references(() => Staffs.id, { onDelete: 'set null' }),
    details: jsonb('details'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('payment_transactions_entity_idx').on(table.entityType, table.entityId),
    appointmentIdx: index('payment_transactions_appointment_idx').on(table.appointmentId),
    createdIdx: index('payment_transactions_created_idx').on(table.createdAt),
  }),
);
