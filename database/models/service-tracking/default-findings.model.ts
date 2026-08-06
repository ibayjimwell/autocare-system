import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const DefaultFindings = pgTable(
  'default_findings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

