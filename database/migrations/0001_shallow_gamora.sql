CREATE TABLE "staff_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"dashboard" boolean DEFAULT false NOT NULL,
	"customers" boolean DEFAULT false NOT NULL,
	"appointments" boolean DEFAULT false NOT NULL,
	"services" boolean DEFAULT false NOT NULL,
	"staffs" boolean DEFAULT false NOT NULL,
	"service_tracking" boolean DEFAULT false NOT NULL,
	"payments" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_access" ADD CONSTRAINT "staff_access_staff_id_staffs_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staffs"("id") ON DELETE cascade ON UPDATE no action;