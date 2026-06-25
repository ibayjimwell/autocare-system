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
  unit: varchar("unit", { length: 50 }).notNull(), // piece, liter, kg, etc.
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  reorderLevel: integer("reorder_level").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
