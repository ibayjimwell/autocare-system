CREATE TABLE "task_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"duration_minutes" integer,
	"phase" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_history_appointment_idx" ON "task_history" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "task_history_phase_idx" ON "task_history" USING btree ("phase");