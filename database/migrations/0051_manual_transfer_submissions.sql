-- Run after the preceding AutoCare migrations. Does not change existing payments.
-- An operator MUST independently verify receipt of actual funds before approval.
BEGIN;
CREATE TABLE IF NOT EXISTS public.manual_transfer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  final_bill_id uuid NOT NULL REFERENCES public.final_bills(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  method varchar(16) NOT NULL CHECK (method IN ('GCASH','MAYA','BANK')),
  destination_account varchar(100) NOT NULL,
  reference_number varchar(100) NOT NULL,
  sender_name varchar(120),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status varchar(24) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW','VERIFYING','REJECTED','APPROVED')),
  staff_note text,
  verified_by_staff_id uuid REFERENCES public.staffs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS manual_transfer_bill_idx ON public.manual_transfer_submissions(final_bill_id,created_at DESC);
CREATE INDEX IF NOT EXISTS manual_transfer_status_idx ON public.manual_transfer_submissions(status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS manual_transfer_provider_reference_uidx
 ON public.manual_transfer_submissions(method, reference_number);
CREATE UNIQUE INDEX IF NOT EXISTS manual_transfer_one_active_per_bill_uidx
 ON public.manual_transfer_submissions(final_bill_id)
 WHERE status IN ('PENDING_REVIEW','VERIFYING');
ALTER TABLE public.manual_transfer_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manual_transfer_submissions FROM PUBLIC, anon, authenticated;
-- Backend uses the existing privileged server-side PostgreSQL connection.
COMMIT;
