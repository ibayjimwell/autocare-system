import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const Inventory = pgTable("inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").default(0).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),          // piece, liter, etc.
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0").notNull(),   // actual cost
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).default("0").notNull(), // POS price
  reorderLevel: integer("reorder_level").default(0).notNull(),
  lowStockAlert: boolean("low_stock_alert").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
