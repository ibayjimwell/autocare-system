import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { Staffs } from '../staffs/staffs.model';

export const StaffNotifications = pgTable('staff_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull().references(() => Staffs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url'),
  module: text('module').notNull().default('app'),
  event: text('event').notNull().default('push'),
  readAt: timestamp('read_at'),
  dismissedAt: timestamp('dismissed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
  staffCreatedIdx: index('staff_notifications_staff_created_idx').on(table.staffId, table.createdAt),
}));
