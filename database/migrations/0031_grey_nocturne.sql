ALTER TABLE "customers" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
CREATE INDEX "customers_is_online_idx" ON "customers" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "customers_last_seen_idx" ON "customers" USING btree ("last_seen_at");