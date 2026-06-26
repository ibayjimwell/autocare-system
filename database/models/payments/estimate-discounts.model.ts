// database/models/service-tracking/estimate-discounts.model.ts
import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimatedCosts } from './estimated-costs.model';

export const EstimateDiscounts = pgTable('estimate_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  estimateId: uuid('estimate_id').references(() => EstimatedCosts.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'fixed' or 'percentage'
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  estimateIdx: index('estimate_discounts_estimate_idx').on(table.estimateId),
}));