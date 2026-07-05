CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(20) NOT NULL,
	"final_bill_id" uuid NOT NULL,
	"estimate_id" uuid,
	"appointment_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_final_bill_id_final_bills_id_fk" FOREIGN KEY ("final_bill_id") REFERENCES "public"."final_bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_estimate_id_estimated_costs_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimated_costs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipts_ref_idx" ON "receipts" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "receipts_final_bill_idx" ON "receipts" USING btree ("final_bill_id");