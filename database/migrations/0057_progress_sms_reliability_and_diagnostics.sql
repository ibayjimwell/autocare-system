-- Apply AFTER 0049 and 0056. Preserves all existing SMS history.
-- IMPORTANT: the Supabase Edge worker must use the same database as AutoCare Web.
BEGIN;
CREATE INDEX IF NOT EXISTS service_progress_sms_appointment_attempt_idx
  ON public.service_progress_sms(appointment_id, attempted_at DESC);

-- Handle legacy phone formatting without modifying customer records.
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
  v_delay text;
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

    SELECT d.reason INTO v_delay FROM public.service_delays d
    WHERE d.appointment_id = v_appt.id AND d.resolved_at IS NULL LIMIT 1;
    appointment_id := v_appt.id;
    tracking_number := v_appt.tracking_number::text;
    phone := v_appt.customer_phone;
    phase := v_appt.stage;
    interval_bucket := v_bucket;
    task_items := v_tasks;
    delay_reason := v_delay;
    RETURN NEXT;
    v_count := v_count + 1;
    v_delay := NULL;
  END LOOP;
END;
$function$;

-- Health RPC returns aggregate counts only: no customer PII or SMS message bodies.
CREATE OR REPLACE FUNCTION public.autocare_progress_sms_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_config jsonb;
  v_minutes integer;
  v_value integer;
  v_unit text;
  v_eligible integer := 0;
  v_due integer := 0;
  v_invalid integer := 0;
  v_failed integer := 0;
  v_stale integer := 0;
  v_last_attempt timestamptz;
  v_last_sent timestamptz;
  v_last_failure text;
BEGIN
  SELECT c.config INTO v_config FROM public.configurations c WHERE c.module = 'service_progress_sms';
  v_value := CASE WHEN COALESCE(v_config->>'intervalValue', '') ~ '^[0-9]{1,5}$'
             THEN (v_config->>'intervalValue')::integer ELSE 10 END;
  v_unit := COALESCE(v_config->>'intervalUnit', 'minutes');
  v_minutes := v_value * CASE WHEN v_unit = 'hours' THEN 60 ELSE 1 END;
  SELECT count(*) FILTER (WHERE NOT c.deactivated AND public.autocare_sms_normalize_phone(c.phone) IS NOT NULL),
         count(*) FILTER (WHERE NOT c.deactivated AND public.autocare_sms_normalize_phone(c.phone) IS NULL)
    INTO v_eligible, v_invalid
  FROM public.appointments a JOIN public.customers c ON c.id = a.customer_id
  WHERE a.status::text IN ('UNDER_INSPECTION', 'IN_PROGRESS');
  SELECT count(*) INTO v_due
  FROM public.appointments a JOIN public.customers c ON c.id = a.customer_id
  WHERE a.status::text IN ('UNDER_INSPECTION', 'IN_PROGRESS')
    AND NOT c.deactivated AND public.autocare_sms_normalize_phone(c.phone) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.service_progress_sms s
      WHERE s.appointment_id = a.id AND s.attempted_at > now() - make_interval(mins => v_minutes)
    );
  SELECT count(*) INTO v_failed FROM public.service_progress_sms s
    WHERE s.status = 'FAILED' AND s.attempted_at >= now() - interval '24 hours';
  SELECT count(*) INTO v_stale FROM public.service_progress_sms s
    WHERE s.status = 'CLAIMED' AND s.attempted_at < now() - interval '5 minutes';
  SELECT max(s.attempted_at), max(s.submitted_at) INTO v_last_attempt, v_last_sent
    FROM public.service_progress_sms s;
  SELECT left(s.last_error, 180) INTO v_last_failure
    FROM public.service_progress_sms s WHERE s.status = 'FAILED'
    ORDER BY s.attempted_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'enabled', COALESCE(v_config->>'enabled', 'false') = 'true',
    'intervalMinutes', v_minutes,
    'eligibleAppointments', v_eligible,
    'dueAppointments', v_due,
    'invalidPhoneAppointments', v_invalid,
    'failedLast24h', v_failed,
    'staleClaims', v_stale,
    'lastAttemptAt', v_last_attempt,
    'lastSubmittedAt', v_last_sent,
    'lastFailure', v_last_failure
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.autocare_sms_normalize_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.autocare_claim_progress_sms(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.autocare_progress_sms_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autocare_claim_progress_sms(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.autocare_progress_sms_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.autocare_sms_normalize_phone(text) TO service_role;
COMMIT;
