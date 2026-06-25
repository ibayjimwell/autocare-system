CREATE TABLE "estimated_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"service_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"findings_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fees_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"description" text NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"parts_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_finding_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_finding_id" uuid NOT NULL,
	"part_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_pms" boolean DEFAULT false NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"finding_id" uuid,
	"title" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimated_costs" ADD CONSTRAINT "estimated_costs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_findings" ADD CONSTRAINT "estimate_findings_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_findings" ADD CONSTRAINT "estimate_findings_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_finding_parts" ADD CONSTRAINT "estimate_finding_parts_estimate_finding_id_estimate_findings_id_fk" FOREIGN KEY ("estimate_finding_id") REFERENCES "public"."estimate_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_fees" ADD CONSTRAINT "estimate_fees_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_fees" ADD CONSTRAINT "estimate_fees_finding_id_inspection_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."inspection_findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_discounts" ADD CONSTRAINT "estimate_discounts_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estimated_costs_appointment_idx" ON "estimated_costs" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "estimate_findings_estimate_idx" ON "estimate_findings" USING btree ("estimate_id");--> statement-breakpoint
CREATE INDEX "estimate_finding_parts_estimate_finding_idx" ON "estimate_finding_parts" USING btree ("estimate_finding_id");--> statement-breakpoint
CREATE INDEX "estimate_fees_estimate_idx" ON "estimate_fees" USING btree ("estimate_id");--> statement-breakpoint
CREATE INDEX "estimate_discounts_estimate_idx" ON "estimate_discounts" USING btree ("estimate_id");