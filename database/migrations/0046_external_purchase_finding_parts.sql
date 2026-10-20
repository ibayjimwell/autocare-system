-- AutoCare: appointment-specific external procurement for Finding Parts.
-- ADDITIVE ONLY. Existing quantities, part prices, inventory items,
-- Default Findings, appointments and reservations are unchanged.
-- Run once in Supabase SQL Editor before deploying the matching TS files.
BEGIN;

ALTER TABLE public.inspection_finding_parts
  ADD COLUMN IF NOT EXISTS external_purchase_status text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inspection_finding_parts_external_purchase_status_chk'
      AND conrelid = 'public.inspection_finding_parts'::regclass
  ) THEN
    ALTER TABLE public.inspection_finding_parts
      ADD CONSTRAINT inspection_finding_parts_external_purchase_status_chk
      CHECK (external_purchase_status IS NULL OR
             external_purchase_status IN ('PENDING', 'PURCHASED', 'RECEIVED'));
  END IF;
END;
$$;

-- Ensure externally sourced parts never keep a local stock link.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inspection_finding_parts_external_unlinked_chk'
      AND conrelid = 'public.inspection_finding_parts'::regclass
  ) THEN
    ALTER TABLE public.inspection_finding_parts
      ADD CONSTRAINT inspection_finding_parts_external_unlinked_chk
      CHECK (external_purchase_status IS NULL OR inventory_item_id IS NULL);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS inspection_finding_parts_external_purchase_idx
  ON public.inspection_finding_parts (external_purchase_status)
  WHERE external_purchase_status IS NOT NULL;

COMMIT;
