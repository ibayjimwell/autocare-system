-- Read-only troubleshooting queries. Run in Supabase SQL Editor (do not publish outputs containing phone numbers).
-- 1. Is the Web SMS setting enabled, and does the interval read 10 minutes?
SELECT module, config FROM public.configurations WHERE module = 'service_progress_sms';

-- 2. Summary: eligible appointments, invalid phone count, due count, submission history.
-- Requires migration 0057.
SELECT public.autocare_progress_sms_health();

-- 3. Is the 1-minute Supabase Cron scheduled and active?
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'autocare-service-progress-sms';

-- 4. Does the scheduler actually run? A job can be 'succeeded' even if the HTTP call returned 401 or 500.
SELECT start_time, status, return_message FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autocare-service-progress-sms')
ORDER BY start_time DESC LIMIT 20;

-- 5. Did the worker create SMS attempts? Never select customer phone numbers here.
SELECT status, attempted_at, submitted_at, left(last_error, 160) AS last_error
FROM public.service_progress_sms ORDER BY attempted_at DESC LIMIT 30;

-- 6. Count appointment phases and explain whether any task records exist.
SELECT a.status::text AS phase, count(*) AS appointments
FROM public.appointments a WHERE a.status::text IN ('UNDER_INSPECTION','IN_PROGRESS')
GROUP BY a.status ORDER BY phase;

-- 7. Is the pg_net HTTP response indicating an Edge Function error?
-- Supabase retains pg_net response rows for a limited period.
SELECT status_code, left(error_msg,160) AS error, created
FROM net._http_response ORDER BY created DESC LIMIT 20;

-- Do not run the claim RPC directly as a test: it reserves a send slot but sends no SMS.
