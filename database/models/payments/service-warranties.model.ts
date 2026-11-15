import { pgTable, uuid, varchar, date, text, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimatedCosts } from './estimated-costs.model';
import { Inventory } from '../inventory/inventory.model';

/**
 * Estimate-level warranties added in migration 0059.
 *
 * Intentionally NOT mapped to `service_warranties`, which is the legacy
 * appointment-level warranty table created in migration 0049 and used by
 * `database/models/service-journey/service-journey.model.ts`.
 */
export const ServiceWarranties = pgTable('estimate_service_warranties', {
  id: uuid('id').defaultRandom().primaryKey(),
  estimateId: uuid('estimate_id').references(() => EstimatedCosts.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  coverageType: varchar('coverage_type', { length: 16 }).notNull(),
  provider: varchar('provider', { length: 160 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  coverage: text('coverage').notNull(),
  terms: text('terms').notNull(),
  exclusions: text('exclusions').default('').notNull(),
  claimInstructions: text('claim_instructions').notNull(),
  contact: varchar('contact', { length: 255 }).default('').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  estimateIdx: index('estimate_service_warranties_estimate_idx').on(t.estimateId),
}));

export const ServiceWarrantyParts = pgTable('estimate_service_warranty_parts', {
  id: uuid('id').defaultRandom().primaryKey(),
  warrantyId: uuid('warranty_id').references(() => ServiceWarranties.id, { onDelete: 'cascade' }).notNull(),
  inventoryId: uuid('inventory_id').references(() => Inventory.id, { onDelete: 'set null' }),
  partName: varchar('part_name', { length: 255 }).notNull(),
}, t => ({
  inventoryIdx: index('estimate_service_warranty_parts_inventory_idx').on(t.inventoryId),
  warrantyIdx: index('estimate_service_warranty_parts_warranty_idx').on(t.warrantyId),
}));
