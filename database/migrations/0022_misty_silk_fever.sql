CREATE TABLE "default_task_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "default_task_groups_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "default_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"duration_minutes" integer,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "default_tasks" ADD CONSTRAINT "default_tasks_group_id_default_task_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."default_task_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "default_tasks_group_idx" ON "default_tasks" USING btree ("group_id");