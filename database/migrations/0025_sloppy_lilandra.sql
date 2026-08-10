CREATE TABLE "estimate_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"duration_minutes" integer,
	"status" text DEFAULT 'DONE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estimate_tasks" ADD CONSTRAINT "estimate_tasks_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_tasks" ADD CONSTRAINT "estimate_tasks_task_id_inspection_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."inspection_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estimate_tasks_estimate_idx" ON "estimate_tasks" USING btree ("estimate_id");