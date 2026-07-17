// database/models/notifications/customer-push-subscription.model.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { Customers } from '../customers/customers.model';

export const CustomerPushSubscriptions = pgTable('customer_push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .references(() => Customers.id, { onDelete: 'cascade' })
    .notNull(),
  expoPushToken: text('expo_push_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});