// database/models/customers/phone-verification-otps.model.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { Customers } from './customers.model';

export const PhoneVerificationOtps = pgTable('phone_verification_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .references(() => Customers.id, { onDelete: 'cascade' })
    .notNull(),
  phone: varchar('phone', { length: 20 }).notNull(), // the phone number to which OTP was sent
  otp: varchar('otp', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});