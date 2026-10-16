import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { Appointments } from "../appointments/appointments.model";
import { DefaultTasks } from "./default-tasks.model";

export const WorkTasks = pgTable(
  "work_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .references(() => Appointments.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    // Source template, when automatically created; null for manually added tasks.
    defaultTaskId: uuid("default_task_id").references(() => DefaultTasks.id, { onDelete: "set null" }),
    status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, DONE
    order: integer("order").default(0),
    durationMinutes: integer("duration_minutes"), // estimated duration in minutes
    startedAt: timestamp("started_at"), // when task was started
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    sourceTemplateUnique: uniqueIndex("work_tasks_appointment_template_uidx").on(table.appointmentId, table.defaultTaskId),
    appointmentIdx: index("work_tasks_appointment_idx").on(table.appointmentId),
  }),
);
