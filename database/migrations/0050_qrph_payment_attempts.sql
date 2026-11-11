-- AutoCare: track QR Ph attempts so Web and Mobile see the same provider result.
-- Do not expose payment intent identifiers or provider metadata through Supabase client access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.qrph_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  final_bill_id uuid NOT NULL REFERENCES public.final_bills(id) ON DELETE CASCADE,
  payment_intent_id text NOT NULL UNIQUE,
  amount_centavos integer NOT NULL CHECK (amount_centavos >= 100),
  status text NOT NULL DEFAULT 'INITIATED'
    CHECK (status IN ('INITIATED','PENDING','PROCESSING','SUCCEEDED','FAILED','EXPIRED')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qrph_attempt_bill_created_idx
 ON public.qrph_payment_attempts (final_bill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qrph_attempt_pending_idx
 ON public.qrph_payment_attempts (status, expires_at)
 WHERE status IN ('INITIATED','PENDING','PROCESSING');
-- Prevent two separately payable QR codes for the same Final Cost.
CREATE UNIQUE INDEX IF NOT EXISTS qrph_one_active_attempt_per_bill
 ON public.qrph_payment_attempts(final_bill_id)
 WHERE status IN ('INITIATED','PENDING','PROCESSING');
ALTER TABLE public.qrph_payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.qrph_payment_attempts FROM PUBLIC, anon, authenticated;
-- Server-side DB access uses the existing privileged PostgreSQL connection.
COMMIT;
