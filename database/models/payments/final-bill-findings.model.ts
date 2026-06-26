import { pgTable, uuid, text, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';
import { InspectionFindings } from '../service-tracking/inspection-findings.model';

export const FinalBillFindings = pgTable(
  "final_bill_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    finalBillId: uuid("final_bill_id")
      .references(() => FinalBill.id, { onDelete: "cascade" })
      .notNull(),
    findingId: uuid("finding_id")
      .references(() => InspectionFindings.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    included: boolean("included").default(true).notNull(),
    partsSubtotal: decimal("parts_subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    finalBillIdx: index("final_bill_findings_final_bill_idx").on(table.finalBillId),
  }),
);