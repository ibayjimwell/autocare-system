// database/models/service-tracking/inspection-finding-parts.model.ts
import {
  pgTable,
  uuid,
  integer,
  decimal,
  boolean,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";
import { InspectionFindings } from "./inspection-findings.model";
import { Inventory } from "../inventory/inventory.model";

export const InspectionFindingParts = pgTable(
  "inspection_finding_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    findingId: uuid("finding_id")
      .references(() => InspectionFindings.id, { onDelete: "cascade" })
      .notNull(),
    inventoryItemId: uuid("inventory_item_id").references(() => Inventory.id, {
      onDelete: "set null",
    }),
    partName: text("part_name"), // for outside-store parts
    quantity: integer("quantity").default(1).notNull(),
    priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    isPms: boolean("is_pms").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    findingIdx: index("inspection_finding_parts_finding_idx").on(
      table.findingId,
    ),
  }),
);
