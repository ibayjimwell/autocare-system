import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';
import { WorkTasks } from '../service-tracking/work-tasks.model';

export const FinalBillWorkTasks = pgTable(
  "final_bill_work_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    finalBillId: uuid("final_bill_id")
      .references(() => FinalBill.id, { onDelete: "cascade" })
      .notNull(),
    workTaskId: uuid("work_task_id")
      .references(() => WorkTasks.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    order: integer("order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    finalBillIdx: index("final_bill_work_tasks_final_bill_idx").on(table.finalBillId),
  }),
);