-- AutoCare: scheduled SMS worker on Supabase, not Vercel.
-- Prerequisite: 0049_streamlined_service_journey.sql and existing configurations table.
-- Does not turn SMS on automatically. Enable it in Service Tracking settings.
BEGIN;

INSERT INTO public.configurations (module, config, created_at, updated_at)
VALUES ('service_progress_sms', '{"enabled":false,"intervalValue":10,"intervalUnit":"minutes"}'::jsonb, now(), now())
ON CONFLICT (module) DO NOTHING;

-- A short-lived, atomic claim prevents overlapping cron invocations from sending
-- the same appointment twice in a time slot. Existing history is preserved.
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_config jsonb;
  v_minutes integer;
  v_value integer;
  v_unit text;
  v_appt record;
  v_claimed uuid;
  v_bucket timestamptz := date_trunc('minute', clock_timestamp());
  v_tasks jsonb;
  v_delay text;
  v_count integer := 0;
BEGIN
  SELECT c.config INTO v_config FROM public.configurations c
  WHERE c.module = 'service_progress_sms';

  -- Disabled is the fail-safe (including on a fresh installation).
  IF COALESCE(v_config->>'enabled', 'false') <> 'true' THEN RETURN; END IF;
  IF COALESCE(v_config->>'intervalValue', '') !~ '^[0-9]{1,5}$' THEN RETURN; END IF;
  v_value := (v_config->>'intervalValue')::integer;
  v_unit := COALESCE(v_config->>'intervalUnit', 'minutes');
  IF v_unit NOT IN ('minutes', 'hours') OR v_value < 1 THEN RETURN; END IF;
  v_minutes := CASE WHEN v_unit = 'hours' THEN v_value * 60 ELSE v_value END;
  IF v_minutes < 5 OR v_minutes > 1440 THEN RETURN; END IF;

  -- Lock rows until the claim transaction commits; SKIP LOCKED lets concurrent
  -- invocations safely process different appointments.
  FOR v_appt IN
    SELECT a.id, a.tracking_number, a.status::text AS stage, c.phone AS customer_phone
    FROM public.appointments a
    JOIN public.customers c ON c.id = a.customer_id
    WHERE a.status::text IN ('UNDER_INSPECTION', 'IN_PROGRESS')
      AND c.deactivated = false
      AND c.phone ~ '^\+639[0-9]{9}$'
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
    INSERT INTO public.service_progress_sms AS sms_record (appointment_id, interval_bucket, status, attempted_at)
    VALUES (v_appt.id, v_bucket, 'CLAIMED', clock_timestamp())
    ON CONFLICT DO NOTHING
    RETURNING sms_record.appointment_id INTO v_claimed;
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
    phone := v_appt.customer_phone::text;
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

CREATE OR REPLACE FUNCTION public.autocare_complete_progress_sms(
  p_appointment_id uuid, p_interval_bucket timestamptz,
  p_status text, p_last_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_updated integer;
BEGIN
  IF p_status NOT IN ('SUBMITTED', 'FAILED') THEN
    RAISE EXCEPTION 'Unsupported SMS log status';
  END IF;
  UPDATE public.service_progress_sms
  SET status = p_status,
      submitted_at = CASE WHEN p_status = 'SUBMITTED' THEN clock_timestamp() ELSE NULL END,
      last_error = CASE WHEN p_status = 'FAILED' THEN left(COALESCE(p_last_error, 'Unknown failure'), 300) ELSE NULL END
  WHERE appointment_id = p_appointment_id AND interval_bucket = p_interval_bucket
    AND status = 'CLAIMED';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$function$;

-- Both RPCs are privileged and must never be callable from public clients.
REVOKE ALL ON FUNCTION public.autocare_claim_progress_sms(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.autocare_complete_progress_sms(uuid, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autocare_claim_progress_sms(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.autocare_complete_progress_sms(uuid, timestamptz, text, text) TO service_role;
COMMIT;
