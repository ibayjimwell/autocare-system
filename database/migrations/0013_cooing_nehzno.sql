ALTER TABLE "inspection_tasks" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "inspection_tasks" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "work_tasks" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "work_tasks" ADD COLUMN "started_at" timestamp;