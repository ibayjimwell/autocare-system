CREATE TABLE "final_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"estimate_id" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"service_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"findings_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"work_tasks_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fees_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_bill_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"final_bill_id" uuid NOT NULL,
	"finding_id" uuid,
	"description" text NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"parts_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_bill_finding_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"final_bill_finding_id" uuid NOT NULL,
	"part_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_pms" boolean DEFAULT false NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_bill_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"final_bill_id" uuid NOT NULL,
	"finding_id" uuid,
	"title" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_bill_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"final_bill_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_bill_work_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"final_bill_id" uuid NOT NULL,
	"work_task_id" uuid,
	"title" text NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "final_bills" ADD CONSTRAINT "final_bills_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bills" ADD CONSTRAINT "final_bills_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_findings" ADD CONSTRAINT "final_bill_findings_final_bill_id_final_bills_id_fk" FOREIGN KEY ("final_bill_id") REFERENCES "public"."final_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_findings" ADD CONSTRAINT "final_bill_findings_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_finding_parts" ADD CONSTRAINT "final_bill_finding_parts_final_bill_finding_id_final_bill_findings_id_fk" FOREIGN KEY ("final_bill_finding_id") REFERENCES "public"."final_bill_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_fees" ADD CONSTRAINT "final_bill_fees_final_bill_id_final_bills_id_fk" FOREIGN KEY ("final_bill_id") REFERENCES "public"."final_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_fees" ADD CONSTRAINT "final_bill_fees_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_discounts" ADD CONSTRAINT "final_bill_discounts_final_bill_id_final_bills_id_fk" FOREIGN KEY ("final_bill_id") REFERENCES "public"."final_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_work_tasks" ADD CONSTRAINT "final_bill_work_tasks_final_bill_id_final_bills_id_fk" FOREIGN KEY ("final_bill_id") REFERENCES "public"."final_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_bill_work_tasks" ADD CONSTRAINT "final_bill_work_tasks_work_task_id_work_tasks_id_fk" FOREIGN KEY ("work_task_id") REFERENCES "public"."work_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "final_bills_appointment_idx" ON "final_bills" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "final_bill_findings_final_bill_idx" ON "final_bill_findings" USING btree ("final_bill_id");--> statement-breakpoint
CREATE INDEX "final_bill_finding_parts_finding_idx" ON "final_bill_finding_parts" USING btree ("final_bill_finding_id");--> statement-breakpoint
CREATE INDEX "final_bill_fees_final_bill_idx" ON "final_bill_fees" USING btree ("final_bill_id");--> statement-breakpoint
CREATE INDEX "final_bill_discounts_final_bill_idx" ON "final_bill_discounts" USING btree ("final_bill_id");--> statement-breakpoint
CREATE INDEX "final_bill_work_tasks_final_bill_idx" ON "final_bill_work_tasks" USING btree ("final_bill_id");