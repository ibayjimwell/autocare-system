import { pgTable, uuid, jsonb, decimal, timestamp } from "drizzle-orm/pg-core";

export const PosTransaction = pgTable("pos_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  items: jsonb("items").notNull(),              // array of { inventoryId, name, quantity, sellingPrice, lineTotal }
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentReceived: decimal("payment_received", { precision: 10, scale: 2 }).notNull(),
  changeGiven: decimal("change_given", { precision: 10, scale: 2 }).notNull(),
  staffId: uuid("staff_id"),                     // optional – who processed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
