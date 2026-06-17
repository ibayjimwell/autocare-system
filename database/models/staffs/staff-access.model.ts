import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { Staffs } from './staffs.model';

export const StaffAccess = pgTable('staff_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id')
    .notNull()
    .references(() => Staffs.id, { onDelete: 'cascade' }), // delete access when staff is deleted
  
  // Modules 
  dashboard: boolean('dashboard').default(false).notNull(),
  customers: boolean('customers').default(false).notNull(),
  appointments: boolean('appointments').default(false).notNull(),
  services: boolean('services').default(false).notNull(),
  staffs: boolean('staffs').default(false).notNull(),
  serviceTracking: boolean('service_tracking').default(false).notNull(),
  payments: boolean('payments').default(false).notNull(),
  inventory: boolean('inventory').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});