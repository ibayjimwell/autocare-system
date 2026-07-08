ALTER TABLE "staffs" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staffs" ADD COLUMN "current_module" varchar(50);