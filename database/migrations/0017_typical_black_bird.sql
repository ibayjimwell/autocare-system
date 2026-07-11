CREATE TABLE "pos_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_received" numeric(10, 2) NOT NULL,
	"change_given" numeric(10, 2) NOT NULL,
	"staff_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" RENAME COLUMN "price" TO "cost_price";--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "selling_price" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "low_stock_alert" boolean DEFAULT true NOT NULL;