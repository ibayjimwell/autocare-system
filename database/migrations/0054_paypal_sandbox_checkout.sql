-- CAPSTONE ONLY: PayPal sandbox orders are separate from archived PayMongo attempts.
-- Run once after taking a database backup. Does not modify existing bills.
CREATE TABLE IF NOT EXISTS paypal_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  final_bill_id uuid NOT NULL REFERENCES final_bills(id) ON DELETE CASCADE,
  ticket text NOT NULL UNIQUE,
  order_id text UNIQUE,
  capture_id text UNIQUE,
  amount_centavos integer NOT NULL CHECK (amount_centavos > 0),
  currency_code text NOT NULL DEFAULT 'PHP',
  status text NOT NULL DEFAULT 'READY',
  error_message text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paypal_attempt_bill_idx ON paypal_checkout_attempts(final_bill_id, created_at);
-- At most one open checkout per bill; prevents simultaneous charge attempts.
CREATE UNIQUE INDEX IF NOT EXISTS paypal_attempt_one_open_bill_idx
  ON paypal_checkout_attempts(final_bill_id)
  WHERE status IN ('READY','CREATING','ACTIVE','CAPTURING','CREATE_UNKNOWN');
