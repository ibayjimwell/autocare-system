CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" varchar(50) NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_finding_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"inventory_item_id" uuid,
	"part_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_pms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "type" varchar(50) DEFAULT 'REPAIR';--> statement-breakpoint
ALTER TABLE "inspection_tasks" ADD CONSTRAINT "inspection_tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_finding_parts" ADD CONSTRAINT "inspection_finding_parts_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_finding_parts" ADD CONSTRAINT "inspection_finding_parts_inventory_item_id_inventory_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspection_tasks_appointment_idx" ON "inspection_tasks" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "inspection_findings_appointment_idx" ON "inspection_findings" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "inspection_finding_parts_finding_idx" ON "inspection_finding_parts" USING btree ("finding_id");