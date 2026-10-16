import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const Services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  estimatedDuration: integer('duration_minutes').notNull(),
  active: boolean('active').default(true).notNull(),
  type: varchar('type', { length: 50 }).default('REPAIR').notNull(), // PMS | REPAIR | DIAGNOSTIC
  subcategory: varchar('subcategory', { length: 80 }), // REPAIR subcategory, nullable for legacy records
  isLaborInclude: boolean('is_labor_include').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});