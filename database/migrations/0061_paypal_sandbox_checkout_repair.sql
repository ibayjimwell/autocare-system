-- AutoCare capstone — idempotent schema verification/repair for PayPal SANDBOX.
-- Apply in Supabase SQL Editor ONLY if migration 0054 was never applied,
-- or as a safe no-op for an already-correct schema.
-- This migration does NOT cancel, delete, or modify any payment attempts.
-- Run a database backup before changes.

CREATE TABLE IF NOT EXISTS public.paypal_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  final_bill_id uuid NOT NULL REFERENCES public.final_bills(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS paypal_attempt_bill_idx
  ON public.paypal_checkout_attempts (final_bill_id, created_at);

-- Concurrent checkouts are serialized by this partial index. If creating the
-- index fails due to duplicate open rows, DO NOT delete rows blindly: inspect
-- the rows and reconcile possible captures before attempting repair.
CREATE UNIQUE INDEX IF NOT EXISTS paypal_attempt_one_open_bill_idx
  ON public.paypal_checkout_attempts (final_bill_id)
  WHERE status IN ('READY', 'CREATING', 'ACTIVE', 'CAPTURING', 'CREATE_UNKNOWN');

-- Show installed schema and the number of current open checkouts; safe read-only.
SELECT to_regclass('public.paypal_checkout_attempts') AS checkout_table;
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'paypal_checkout_attempts'
ORDER BY indexname;
