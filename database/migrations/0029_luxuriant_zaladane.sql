CREATE TABLE "appointment_reschedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"requested_by" text NOT NULL,
	"requested_by_customer_id" uuid,
	"requested_by_staff_id" uuid,
	"new_appointment_date" date NOT NULL,
	"new_appointment_time" time NOT NULL,
	"reason" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_reschedule_requests" ADD CONSTRAINT "appointment_reschedule_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reschedule_requests" ADD CONSTRAINT "appointment_reschedule_requests_requested_by_customer_id_customers_id_fk" FOREIGN KEY ("requested_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reschedule_requests" ADD CONSTRAINT "appointment_reschedule_requests_requested_by_staff_id_staffs_id_fk" FOREIGN KEY ("requested_by_staff_id") REFERENCES "public"."staffs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reschedule_requests_appointment_idx" ON "appointment_reschedule_requests" USING btree ("appointment_id");