// database/models/service-tracking/estimate-fees.model.ts
import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimatedCosts } from './estimated-costs.model';
import { InspectionFindings } from '../service-tracking/inspection-findings.model';

export const EstimateFees = pgTable('estimate_fees', {
  id: uuid('id').defaultRandom().primaryKey(),
  estimateId: uuid('estimate_id').references(() => EstimatedCosts.id, { onDelete: 'cascade' }).notNull(),
  findingId: uuid('finding_id').references(() => InspectionFindings.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  estimateIdx: index('estimate_fees_estimate_idx').on(table.estimateId),
}));