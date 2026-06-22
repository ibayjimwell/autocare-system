ALTER TABLE "service_types" RENAME TO "services";--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "service_types_name_unique";--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_name_unique" UNIQUE("name");