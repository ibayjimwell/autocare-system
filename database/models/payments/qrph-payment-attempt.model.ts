import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';

export const QrPhPaymentAttempts = pgTable('qrph_payment_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  finalBillId: uuid('final_bill_id').notNull().references(() => FinalBill.id, { onDelete: 'cascade' }),
  paymentIntentId: text('payment_intent_id').notNull().unique(),
  amountCentavos: integer('amount_centavos').notNull(),
  status: text('status').notNull().default('INITIATED'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  billCreatedIdx: index('qrph_attempt_bill_created_idx').on(table.finalBillId, table.createdAt),
}));
