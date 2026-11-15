-- AutoCare 0060: move provisional parking into Estimates.
-- Run AFTER 0059 and take a database backup first.
BEGIN;
ALTER TABLE public.estimated_costs
  ADD COLUMN IF NOT EXISTS parked_at timestamptz,
  ADD COLUMN IF NOT EXISTS parking_fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_fee_rate numeric(10,2);
ALTER TABLE public.final_bills ALTER COLUMN status SET DEFAULT 'OFFICIAL';
-- Existing Final Costs are not automatically promoted to OFFICIAL: that could
-- freeze an unfinished amount. Review historical PENDING/PARKED records below.
COMMIT;
