-- Apply once after backing up your database. No existing records are modified.
CREATE TABLE IF NOT EXISTS "hosted_checkout_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "final_bill_id" uuid NOT NULL REFERENCES "final_bills"("id") ON DELETE cascade,
  "checkout_session_id" text UNIQUE,
  "reference_number" text NOT NULL UNIQUE,
  "checkout_url" text,
  "payment_method" text NOT NULL,
  "amount_centavos" integer NOT NULL,
  "livemode" boolean NOT NULL,
  "status" text NOT NULL DEFAULT 'CREATING',
  "payment_id" text,
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "hosted_checkout_positive_amount" CHECK ("amount_centavos" > 0),
  CONSTRAINT "hosted_checkout_method_allowed" CHECK ("payment_method" IN ('gcash','paymaya','card'))
);
CREATE INDEX IF NOT EXISTS "hosted_checkout_bill_created_idx" ON "hosted_checkout_attempts" ("final_bill_id", "created_at");
-- Prevent accidental creation of multiple concurrently payable hosted checkout sessions.
CREATE UNIQUE INDEX IF NOT EXISTS "hosted_checkout_one_open_per_bill" ON "hosted_checkout_attempts" ("final_bill_id") WHERE "status" IN ('CREATING','CREATE_UNKNOWN','ACTIVE','PROCESSING');
