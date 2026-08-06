import { pgTable, uuid, text, integer, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { HistoryFindings } from './history-findings.model';

export const HistoryFindingParts = pgTable(
  'history_finding_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    historyFindingId: uuid('history_finding_id')
      .references(() => HistoryFindings.id, { onDelete: 'cascade' })
      .notNull(),
    partName: text('part_name').notNull(),
    quantity: integer('quantity').default(1).notNull(),
    priceAtTime: decimal('price_at_time', { precision: 10, scale: 2 }).default('0').notNull(),
    isPms: boolean('is_pms').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    historyFindingIdx: index('history_finding_parts_history_finding_idx').on(table.historyFindingId),
  })
);