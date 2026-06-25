import { pgTable, uuid, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { Appointments } from '../appointments/appointments.model';
import { EstimatedCosts } from '../billing/estimated-costs.model';

export const FinalBill = pgTable(
  "final_bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .references(() => Appointments.id, { onDelete: "cascade" })
      .notNull(),
    estimateId: uuid("estimate_id")
      .references(() => EstimatedCosts.id, { onDelete: "set null" }),
    status: text("status").default("PENDING").notNull(), // PENDING, PAID, CANCELLED
    serviceSubtotal: decimal("service_subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
    findingsSubtotal: decimal("findings_subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
    workTasksSubtotal: decimal("work_tasks_subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
    feesTotal: decimal("fees_total", { precision: 10, scale: 2 }).default("0").notNull(),
    discountTotal: decimal("discount_total", { precision: 10, scale: 2 }).default("0").notNull(),
    grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    appointmentIdx: index("final_bills_appointment_idx").on(table.appointmentId),
  }),
);