import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { Appointments } from "../appointments/appointments.model";

export const InspectionFindings = pgTable(
  "inspection_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .references(() => Appointments.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    appointmentIdx: index("inspection_findings_appointment_idx").on(
      table.appointmentId,
    ),
  }),
);
