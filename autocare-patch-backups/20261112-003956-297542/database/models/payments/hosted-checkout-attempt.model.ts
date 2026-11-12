import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';

/** A single PayMongo-hosted payment session for an existing, OFFICIAL Final Cost. */
export const HostedCheckoutAttempts = pgTable('hosted_checkout_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  finalBillId: uuid('final_bill_id').notNull().references(() => FinalBill.id, { onDelete: 'cascade' }),
  checkoutSessionId: text('checkout_session_id').unique(),
  referenceNumber: text('reference_number').notNull().unique(),
  checkoutUrl: text('checkout_url'),
  paymentMethod: text('payment_method').notNull(),
  amountCentavos: integer('amount_centavos').notNull(),
  livemode: boolean('livemode').notNull(),
  status: text('status').notNull().default('CREATING'),
  paymentId: text('payment_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  billCreatedIdx: index('hosted_checkout_bill_created_idx').on(table.finalBillId, table.createdAt),
}));
