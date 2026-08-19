ALTER TABLE "final_bills" ADD COLUMN "hold_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "final_bills" ADD COLUMN "parking_fee_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "final_bills" ADD COLUMN "parking_fee_unit" text;