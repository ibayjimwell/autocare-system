CREATE TYPE "public"."inventory_allocation_status" AS ENUM('KEEP', 'USED', 'RESTORED');--> statement-breakpoint
CREATE TABLE "inventory_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"finding_id" uuid,
	"finding_part_id" uuid,
	"inventory_item_id" uuid,
	"item_name" varchar(255) NOT NULL,
	"unit" varchar(50),
	"quantity" integer NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "inventory_allocation_status" DEFAULT 'KEEP' NOT NULL,
	"kept_at" timestamp,
	"used_at" timestamp,
	"restored_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_finding_part_id_inspection_finding_parts_id_fk" FOREIGN KEY ("finding_part_id") REFERENCES "public"."inspection_finding_parts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_inventory_item_id_inventory_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_allocations_appointment_idx" ON "inventory_allocations" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "inventory_allocations_status_idx" ON "inventory_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_allocations_inventory_item_idx" ON "inventory_allocations" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_allocations_finding_idx" ON "inventory_allocations" USING btree ("finding_id");