-- AutoCare inventory: remove inactive state while preserving the legacy active column.
-- WARNING: This intentionally changes existing inactive inventory to active.
-- No inventory row is deleted; stock quantities, prices and linked parts are unchanged.
-- Before executing, verify any unverified/generated sample quantities physically.
-- The active column stays for compatibility with older Drizzle model and queries.
BEGIN;

UPDATE public.inventory
SET active = TRUE, updated_at = now()
WHERE active IS DISTINCT FROM TRUE;

ALTER TABLE public.inventory
  ALTER COLUMN active SET DEFAULT TRUE;

-- Enforce "always active" even if older API clients send active=false.
-- The anonymous block makes repeated migration execution safe.
DO $inventory_always_active$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_always_active_chk'
      AND conrelid = 'public.inventory'::regclass
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT inventory_always_active_chk CHECK (active IS TRUE);
  END IF;
END;
$inventory_always_active$;

COMMIT;

SELECT COUNT(*) AS inventory_rows,
       COUNT(*) FILTER (WHERE active IS FALSE) AS inactive_rows
FROM public.inventory;
