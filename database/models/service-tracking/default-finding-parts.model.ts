import { pgTable, uuid, text, integer, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { DefaultFindings } from './default-findings.model';

export const DefaultFindingParts = pgTable(
  'default_finding_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    findingId: uuid('finding_id')
      .references(() => DefaultFindings.id, { onDelete: 'cascade' })
      .notNull(),
    partName: text('part_name').notNull(),
    quantity: integer('quantity').default(1).notNull(),
    priceAtTime: decimal('price_at_time', { precision: 10, scale: 2 }).default('0').notNull(),
    isPms: boolean('is_pms').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    findingIdx: index('default_finding_parts_finding_idx').on(table.findingId),
  })
);