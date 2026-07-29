CREATE TABLE "configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" varchar(50) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configurations_module_unique" UNIQUE("module")
);
--> statement-breakpoint
CREATE TABLE "configurations_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"previous_config" jsonb NOT NULL,
	"updated_config" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configurations_logs" ADD CONSTRAINT "configurations_logs_configuration_id_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurations_logs" ADD CONSTRAINT "configurations_logs_changed_by_staffs_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."staffs"("id") ON DELETE no action ON UPDATE no action;