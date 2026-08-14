import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { Customers } from './customers.model';

export const PasswordResetOtps = pgTable('password_reset_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .references(() => Customers.id, { onDelete: 'cascade' })
    .notNull(),
  otp: varchar('otp', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});