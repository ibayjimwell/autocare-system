import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';

export const FinalBillDiscounts = pgTable(
  "final_bill_discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    finalBillId: uuid("final_bill_id")
      .references(() => FinalBill.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(), // 'fixed' or 'percentage'
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    finalBillIdx: index("final_bill_discounts_final_bill_idx").on(table.finalBillId),
  }),
);