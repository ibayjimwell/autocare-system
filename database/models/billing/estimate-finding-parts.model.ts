import { pgTable, uuid, text, integer, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimateFindings } from './estimate-findings.model';

export const EstimateFindingParts = pgTable('estimate_finding_parts', {
  id: uuid('id').defaultRandom().primaryKey(),
  estimateFindingId: uuid('estimate_finding_id').references(() => EstimateFindings.id, { onDelete: 'cascade' }).notNull(),
  partName: text('part_name'), // for outside-store parts
  quantity: integer('quantity').default(1).notNull(),
  priceAtTime: decimal('price_at_time', { precision: 10, scale: 2 }).default('0').notNull(),
  isPms: boolean('is_pms').default(false).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  estimateFindingIdx: index('estimate_finding_parts_estimate_finding_idx').on(table.estimateFindingId),
}));