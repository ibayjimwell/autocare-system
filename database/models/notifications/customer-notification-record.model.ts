import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { Customers } from '../customers/customers.model';

/** Customer-visible inbox. Distinct from staff/browser push subscriptions. */
export const CustomerNotificationRecords = pgTable(
  'customer_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => Customers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    url: text('url'),
    module: text('module').notNull().default('app'),
    event: text('event').notNull().default('push'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    readAt: timestamp('read_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    customerCreatedIdx: index('customer_notifications_customer_created_idx').on(
      table.customerId,
      table.createdAt,
      table.id,
    ),
  }),
);
