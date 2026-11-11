import { pgTable, uuid, varchar, decimal, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { FinalBill } from './final-bill.model';
import { Customers } from '../customers/customers.model';
import { Staffs } from '../staffs/staffs.model';

/** An unverified transfer is NEVER equivalent to a settled payment. */
export const ManualTransferSubmissions = pgTable('manual_transfer_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  finalBillId: uuid('final_bill_id').notNull().references(() => FinalBill.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => Customers.id),
  method: varchar('method', { length: 16 }).notNull(),
  destinationAccount: varchar('destination_account', { length: 100 }).notNull(),
  referenceNumber: varchar('reference_number', { length: 100 }).notNull(),
  senderName: varchar('sender_name', { length: 120 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 24 }).notNull().default('PENDING_REVIEW'),
  staffNote: text('staff_note'),
  verifiedByStaffId: uuid('verified_by_staff_id').references(() => Staffs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
}, table => ({
  billIndex: index('manual_transfer_bill_idx').on(table.finalBillId, table.createdAt),
  statusIndex: index('manual_transfer_status_idx').on(table.status, table.createdAt),
  providerReferenceUnique: uniqueIndex('manual_transfer_provider_reference_uidx').on(table.method, table.referenceNumber),
  oneActivePerBill: uniqueIndex('manual_transfer_one_active_per_bill_uidx')
    .on(table.finalBillId).where(sql`${table.status} IN ('PENDING_REVIEW','VERIFYING')`),
}));
