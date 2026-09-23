ALTER TABLE "service_queue" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "service_queue" ADD COLUMN "arrival_request_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_queue" ADD COLUMN "arrival_response_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_queue" ADD COLUMN "arriving_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_queue" ADD COLUMN "arrived_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_queue" ADD COLUMN "working_at" timestamp;--> statement-breakpoint
CREATE INDEX "service_queue_appointment_idx" ON "service_queue" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "service_queue_date_idx" ON "service_queue" USING btree ("queue_date");--> statement-breakpoint
CREATE INDEX "service_queue_date_status_idx" ON "service_queue" USING btree ("queue_date","status");--> statement-breakpoint
CREATE INDEX "service_queue_arrived_at_idx" ON "service_queue" USING btree ("arrived_at");--> statement-breakpoint
CREATE INDEX "service_queue_arriving_at_idx" ON "service_queue" USING btree ("arriving_at");--> statement-breakpoint
CREATE INDEX "service_queue_working_at_idx" ON "service_queue" USING btree ("working_at");