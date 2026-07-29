import { pgTable, uuid, varchar, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';

export const Configurations = pgTable(
  'configurations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    module: varchar('module', { length: 50 }).notNull(),
    config: jsonb('config').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqModule: unique().on(table.module),
  })
);