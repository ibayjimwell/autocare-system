import { pgTable, uuid, text, integer, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBillFindings } from './final-bill-findings.model';

export const FinalBillFindingParts = pgTable(
  "final_bill_finding_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    finalBillFindingId: uuid("final_bill_finding_id")
      .references(() => FinalBillFindings.id, { onDelete: "cascade" })
      .notNull(),
    partName: text("part_name"),
    quantity: integer("quantity").default(1).notNull(),
    priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).default("0").notNull(),
    isPms: boolean("is_pms").default(false).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    finalBillFindingIdx: index("final_bill_finding_parts_finding_idx").on(table.finalBillFindingId),
  }),
);