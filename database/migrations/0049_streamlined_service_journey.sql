-- AutoCare capstone revision: non-destructive additions. Backup before applying.
BEGIN;
CREATE TABLE IF NOT EXISTS public.service_delays (
 appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 4 AND 600),
 expected_ready_at timestamptz,
 reported_by uuid,
 reported_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.service_warranties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
 coverage text NOT NULL DEFAULT 'Labor workmanship (subject to written warranty terms)',
 terms text NOT NULL DEFAULT 'Warranty applies to covered labor only; consumables and unrelated damage excluded. Contact the shop for assessment.',
 starts_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at > starts_at)
);
CREATE TABLE IF NOT EXISTS public.service_progress_sms (
 appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
 interval_bucket timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'CLAIMED' CHECK (status IN ('CLAIMED','SUBMITTED','FAILED')),
 attempted_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz,
 last_error text,
 PRIMARY KEY(appointment_id, interval_bucket)
);
CREATE INDEX IF NOT EXISTS service_progress_sms_status_idx ON public.service_progress_sms(status, attempted_at);
CREATE TABLE IF NOT EXISTS public.cash_counter_checkins (
 bill_id uuid PRIMARY KEY REFERENCES public.final_bills(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES public.customers(id),
 scanned_at timestamptz NOT NULL DEFAULT now()
);
-- No scan can mark the bill PAID. Only existing cashier workflow accepts cash.
-- Existing rows, quantities, estimates and payments are unchanged.
COMMIT;
