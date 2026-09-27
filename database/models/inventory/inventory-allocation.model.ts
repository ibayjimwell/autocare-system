import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { Appointments } from '../appointments/appointments.model';
import { InspectionFindings } from '../service-tracking/inspection-findings.model';
import { InspectionFindingParts } from '../service-tracking/inspection-finding-parts.model';
import { Inventory } from './inventory.model';
import { InventoryAllocationStatusEnum } from './enum/inventory-allocation-status.enum';

export const InventoryAllocations = pgTable(
  'inventory_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    appointmentId: uuid('appointment_id')
      .references(() => Appointments.id)
      .notNull(),

    findingId: uuid('finding_id').references(
      () => InspectionFindings.id,
      { onDelete: 'set null' },
    ),

    findingPartId: uuid('finding_part_id').references(
      () => InspectionFindingParts.id,
      { onDelete: 'set null' },
    ),

    inventoryItemId: uuid('inventory_item_id').references(
      () => Inventory.id,
      { onDelete: 'set null' },
    ),

    itemName: varchar('item_name', {
      length: 255,
    }).notNull(),

    unit: varchar('unit', {
      length: 50,
    }),

    quantity: integer('quantity').notNull(),

    priceAtTime: decimal('price_at_time', {
      precision: 10,
      scale: 2,
    }).default('0').notNull(),

    status: InventoryAllocationStatusEnum('status')
      .default('KEEP')
      .notNull(),

    keptAt: timestamp('kept_at'),
    usedAt: timestamp('used_at'),
    restoredAt: timestamp('restored_at'),

    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    appointmentIdx: index(
      'inventory_allocations_appointment_idx',
    ).on(table.appointmentId),

    statusIdx: index(
      'inventory_allocations_status_idx',
    ).on(table.status),

    inventoryItemIdx: index(
      'inventory_allocations_inventory_item_idx',
    ).on(table.inventoryItemId),

    findingIdx: index(
      'inventory_allocations_finding_idx',
    ).on(table.findingId),
  }),
);
