-- AutoCare automated service timing. Apply after existing migrations.
-- No historical timestamps are fabricated: old DONE tasks without a reliable
-- completion time remain excluded from exact early/late calculations.
BEGIN;
ALTER TABLE public.inspection_tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS extension_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE public.work_tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS extension_minutes integer NOT NULL DEFAULT 0;
-- Keep the extension within a day per task; prevent negative time.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='inspection_task_extension_bounds') THEN
    ALTER TABLE public.inspection_tasks ADD CONSTRAINT inspection_task_extension_bounds CHECK (extension_minutes BETWEEN 0 AND 1440);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='work_task_extension_bounds') THEN
    ALTER TABLE public.work_tasks ADD CONSTRAINT work_task_extension_bounds CHECK (extension_minutes BETWEEN 0 AND 1440);
  END IF;
END $$;
-- Archive the old manual reports without dropping historical rows.
UPDATE public.service_delays SET resolved_at = COALESCE(resolved_at, now()), updated_at = now()
WHERE resolved_at IS NULL;

-- Update scheduled SMS to stop reading archived manual delay reports.
-- Keep the existing delay_reason output field for backward compatibility with
-- previously deployed Edge Function versions; the value is always NULL.
CREATE OR REPLACE FUNCTION public.autocare_sms_normalize_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
WITH input AS (
  SELECT regexp_replace(p_phone, '[^0-9]', '', 'g') AS digits
), local AS (
  SELECT CASE
    WHEN digits ~ '^639[0-9]{9}$' THEN substring(digits FROM 3)
    WHEN digits ~ '^09[0-9]{9}$' THEN substring(digits FROM 2)
    WHEN digits ~ '^9[0-9]{9}$' THEN digits
    ELSE NULL
  END AS number FROM input
)
SELECT CASE WHEN number IS NOT NULL THEN '+63' || number ELSE NULL END FROM local;
$$;

CREATE OR REPLACE FUNCTION public.autocare_claim_progress_sms(p_limit integer DEFAULT 20)
RETURNS TABLE (
  appointment_id uuid,
  tracking_number text,
  phone text,
  phase text,
  interval_bucket timestamptz,
  task_items jsonb,
  delay_reason text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_config jsonb;
  v_value integer;
  v_unit text;
  v_minutes integer;
  v_appt record;
  v_claimed uuid;
  v_bucket timestamptz := date_trunc('minute', clock_timestamp());
  v_tasks jsonb;
  v_count integer := 0;
BEGIN
  SELECT c.config INTO v_config FROM public.configurations c WHERE c.module = 'service_progress_sms';
  IF COALESCE(v_config->>'enabled', 'false') <> 'true' THEN RETURN; END IF;
  IF COALESCE(v_config->>'intervalValue', '') !~ '^[0-9]{1,5}$' THEN RETURN; END IF;
  v_value := (v_config->>'intervalValue')::integer;
  v_unit := COALESCE(v_config->>'intervalUnit', 'minutes');
  IF v_value < 1 OR v_unit NOT IN ('minutes', 'hours') THEN RETURN; END IF;
  v_minutes := CASE WHEN v_unit = 'hours' THEN v_value * 60 ELSE v_value END;
  IF v_minutes < 5 OR v_minutes > 1440 THEN RETURN; END IF;

  FOR v_appt IN
    SELECT a.id, a.tracking_number, a.status::text AS stage,
           public.autocare_sms_normalize_phone(c.phone) AS customer_phone
    FROM public.appointments a
    JOIN public.customers c ON c.id = a.customer_id
    WHERE a.status::text IN ('UNDER_INSPECTION', 'IN_PROGRESS')
      AND c.deactivated = false
      AND public.autocare_sms_normalize_phone(c.phone) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.service_progress_sms s
        WHERE s.appointment_id = a.id
          AND s.attempted_at > clock_timestamp() - make_interval(mins => v_minutes)
      )
    ORDER BY a.updated_at ASC, a.id
    FOR UPDATE OF a SKIP LOCKED
  LOOP
    EXIT WHEN v_count >= LEAST(GREATEST(p_limit, 1), 25);
    v_claimed := NULL;
    INSERT INTO public.service_progress_sms AS row_claim (appointment_id, interval_bucket, status, attempted_at)
    VALUES (v_appt.id, v_bucket, 'CLAIMED', clock_timestamp())
    ON CONFLICT DO NOTHING
    RETURNING row_claim.appointment_id INTO v_claimed;
    IF v_claimed IS NULL THEN CONTINUE; END IF;

    IF v_appt.stage = 'UNDER_INSPECTION' THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('title', t.title, 'status', t.status)
             ORDER BY t."order" NULLS LAST, t.created_at, t.id), '[]'::jsonb)
      INTO v_tasks FROM public.inspection_tasks t WHERE t.appointment_id = v_appt.id;
    ELSE
      SELECT COALESCE(jsonb_agg(jsonb_build_object('title', t.title, 'status', t.status)
             ORDER BY t."order" NULLS LAST, t.created_at, t.id), '[]'::jsonb)
      INTO v_tasks FROM public.work_tasks t WHERE t.appointment_id = v_appt.id;
    END IF;

    appointment_id := v_appt.id;
    tracking_number := v_appt.tracking_number::text;
    phone := v_appt.customer_phone;
    phase := v_appt.stage;
    interval_bucket := v_bucket;
    task_items := v_tasks;
    delay_reason := NULL; -- Manual reporting has been retired.
    RETURN NEXT;
    v_count := v_count + 1;
  END LOOP;
END;
$function$;


REVOKE ALL ON FUNCTION public.autocare_claim_progress_sms(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autocare_claim_progress_sms(integer) TO service_role;
COMMIT;
