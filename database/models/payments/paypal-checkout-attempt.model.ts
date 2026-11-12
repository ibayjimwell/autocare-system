import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';

/** One provider-owned PayPal order per checkout. Secret browser ticket never leaves AutoCare. */
export const PaypalCheckoutAttempts = pgTable('paypal_checkout_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  finalBillId: uuid('final_bill_id').notNull().references(() => FinalBill.id, { onDelete: 'cascade' }),
  ticket: text('ticket').notNull().unique(),
  orderId: text('order_id').unique(),
  captureId: text('capture_id').unique(),
  amountCentavos: integer('amount_centavos').notNull(),
  currencyCode: text('currency_code').notNull().default('PHP'),
  status: text('status').notNull().default('READY'),
  errorMessage: text('error_message'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  byBill: index('paypal_attempt_bill_idx').on(t.finalBillId, t.createdAt),
}));
