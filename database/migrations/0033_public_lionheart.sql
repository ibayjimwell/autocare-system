ALTER TABLE "final_bills" RENAME COLUMN "hold_started_at" TO "parked_at";--> statement-breakpoint
ALTER TABLE "final_bills" ADD COLUMN "parking_fee_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "final_bills" DROP COLUMN "parking_fee_unit";