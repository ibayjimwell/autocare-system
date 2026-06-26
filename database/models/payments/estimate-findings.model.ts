import { pgTable, uuid, text, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimatedCosts } from './estimated-costs.model';
import { InspectionFindings } from '../service-tracking/inspection-findings.model';

export const EstimateFindings = pgTable('estimate_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  estimateId: uuid('estimate_id').references(() => EstimatedCosts.id, { onDelete: 'cascade' }).notNull(),
  findingId: uuid('finding_id').references(() => InspectionFindings.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  included: boolean('included').default(true).notNull(),
  partsSubtotal: decimal('parts_subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  estimateIdx: index('estimate_findings_estimate_idx').on(table.estimateId),
}));