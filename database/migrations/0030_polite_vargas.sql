ALTER TABLE "default_tasks" ADD COLUMN "task_type" text DEFAULT 'INSPECTION' NOT NULL;--> statement-breakpoint
CREATE INDEX "default_tasks_type_idx" ON "default_tasks" USING btree ("task_type");