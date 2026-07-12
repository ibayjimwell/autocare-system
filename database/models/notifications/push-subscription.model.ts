import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { Staffs } from '../staffs/staffs.model';

export const PushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').references(() => Staffs.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});