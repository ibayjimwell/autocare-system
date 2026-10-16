-- AutoCare Services upgrade. Run once on the Supabase PostgreSQL database BEFORE deploying updated API.
-- Existing base prices are unchanged. Legacy services default to labor NOT included until reviewed.
BEGIN;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_labor_include boolean NOT NULL DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory varchar(80);
-- Normalize prior taxonomy; inspect old MODIFICATION entries if their semantics differ.
UPDATE public.services SET type = 'DIAGNOSTIC' WHERE UPPER(TRIM(type)) = 'CHECKUP';
UPDATE public.services SET type = 'REPAIR' WHERE UPPER(TRIM(type)) = 'MODIFICATION';
UPDATE public.services SET type = 'REPAIR' WHERE type IS NULL OR TRIM(type) = '';
ALTER TABLE public.services ALTER COLUMN type SET DEFAULT 'REPAIR';
ALTER TABLE public.services ALTER COLUMN type SET NOT NULL;
COMMIT;
-- REPAIR rows that already existed may have a NULL subcategory; classify them in Services > Edit.
