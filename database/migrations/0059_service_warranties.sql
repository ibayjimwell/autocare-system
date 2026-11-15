-- AutoCare estimate warranty tables (corrected migration 0059).
-- IMPORTANT: migration 0049 already created public.service_warranties for
-- appointment-level service-journey warranties. NEVER alter, drop or rename it.
-- The estimate warranty feature uses separate tables to avoid this collision.
-- Safe to rerun after the original 0059 failed on "column estimate_id does not exist".

BEGIN;

CREATE TABLE IF NOT EXISTS public.estimate_service_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimated_costs(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  coverage_type varchar(16) NOT NULL
    CHECK (coverage_type IN ('SERVICE', 'PARTS', 'BOTH')),
  provider varchar(160) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  coverage text NOT NULL,
  terms text NOT NULL,
  exclusions text NOT NULL DEFAULT '',
  claim_instructions text NOT NULL,
  contact varchar(255) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estimate_warranty_valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS estimate_service_warranties_estimate_idx
  ON public.estimate_service_warranties (estimate_id);

CREATE TABLE IF NOT EXISTS public.estimate_service_warranty_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid NOT NULL REFERENCES public.estimate_service_warranties(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  part_name varchar(255) NOT NULL,
  CONSTRAINT estimate_warranty_part_name_nonblank
    CHECK (length(trim(part_name)) > 0)
);

CREATE INDEX IF NOT EXISTS estimate_service_warranty_parts_inventory_idx
  ON public.estimate_service_warranty_parts (inventory_id);

CREATE INDEX IF NOT EXISTS estimate_service_warranty_parts_warranty_idx
  ON public.estimate_service_warranty_parts (warranty_id);

CREATE UNIQUE INDEX IF NOT EXISTS estimate_service_warranty_parts_pair_idx
  ON public.estimate_service_warranty_parts (warranty_id, inventory_id)
  WHERE inventory_id IS NOT NULL;

-- Keep estimate warranty data behind the existing authenticated Web APIs.
-- The application uses its server-side PostgreSQL connection for these tables.
ALTER TABLE public.estimate_service_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_service_warranty_parts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.estimate_service_warranties FROM anon, authenticated;
REVOKE ALL ON TABLE public.estimate_service_warranty_parts FROM anon, authenticated;

COMMIT;
