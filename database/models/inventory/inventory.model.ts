import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const Inventory = pgTable(
  'inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    description: text('description'),

    barcode: varchar('barcode', {
      length: 64,
    }),

    quantity: integer('quantity')
      .default(0)
      .notNull(),

    unit: varchar('unit', {
      length: 50,
    }).notNull(),

    costPrice: decimal('cost_price', {
      precision: 10,
      scale: 2,
    })
      .default('0')
      .notNull(),

    sellingPrice: decimal('selling_price', {
      precision: 10,
      scale: 2,
    })
      .default('0')
      .notNull(),

    reorderLevel: integer('reorder_level')
      .default(0)
      .notNull(),

    lowStockAlert: boolean('low_stock_alert')
      .default(true)
      .notNull(),

    active: boolean('active')
      .default(true)
      .notNull(),

    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull(),
  },
  table => ({
    barcodeUniqueIdx: uniqueIndex(
      'inventory_barcode_unique_idx',
    ).on(table.barcode),

    nameIdx: index(
      'inventory_name_idx',
    ).on(table.name),

    lowStockIdx: index(
      'inventory_low_stock_idx',
    ).on(
      table.quantity,
      table.reorderLevel,
      table.lowStockAlert,
    ),
  }),
);
