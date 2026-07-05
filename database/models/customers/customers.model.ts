// database/models/customers/customers.model.ts
import { pgTable, uuid, varchar, timestamp, index, boolean } from 'drizzle-orm/pg-core';

export const Customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullname: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  deactivated: boolean('deactivated').default(false).notNull(),
  tempPassword: boolean('temp_password').default(true).notNull(),   
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('customers_email_idx').on(table.email),
  phoneIdx: index('customers_phone_idx').on(table.phone),
}));