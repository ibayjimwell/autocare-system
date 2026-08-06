CREATE TABLE "default_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "default_finding_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"part_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_pms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"description" text NOT NULL,
	"phase" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history_finding_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"history_finding_id" uuid NOT NULL,
	"part_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_pms" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "default_finding_parts" ADD CONSTRAINT "default_finding_parts_finding_id_default_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."default_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_findings" ADD CONSTRAINT "history_findings_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_finding_parts" ADD CONSTRAINT "history_finding_parts_history_finding_id_history_findings_id_fk" FOREIGN KEY ("history_finding_id") REFERENCES "public"."history_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "default_finding_parts_finding_idx" ON "default_finding_parts" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "history_findings_appointment_idx" ON "history_findings" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "history_finding_parts_history_finding_idx" ON "history_finding_parts" USING btree ("history_finding_id");