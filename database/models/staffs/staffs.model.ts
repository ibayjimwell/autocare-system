// database/models/staffs/staffs.model.ts
import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const Staffs = pgTable('staffs', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullname: varchar('full_name', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }),
  tempPassword: boolean('temp_password').default(true).notNull(),
  inBoarding: boolean('in_boarding').default(true).notNull(),
  isOnline: boolean('is_online').default(false).notNull(),
  currentModule: varchar('current_module', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index('staffs_username_idx').on(table.username),
}));