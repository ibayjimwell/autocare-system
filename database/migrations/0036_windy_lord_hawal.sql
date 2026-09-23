ALTER TABLE "inventory" ADD COLUMN "barcode" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_barcode_unique_idx" ON "inventory" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "inventory_name_idx" ON "inventory" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inventory_low_stock_idx" ON "inventory" USING btree ("quantity","reorder_level","low_stock_alert");