import { pgTable, uuid, text, timestamp, boolean, unique } from 'drizzle-orm/pg-core';

export const DefaultTaskGroups = pgTable(
  'default_task_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Optionally unique title
    uniqTitle: unique().on(table.title),
  })
);