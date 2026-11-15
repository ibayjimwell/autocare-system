-- Run in Supabase SQL Editor AFTER deploying the edge function.
-- Before running, create TWO secrets from the SQL Editor (private, not committed):
-- SELECT vault.create_secret('https://PROJECT_REF.supabase.co', 'autocare_sms_project_url');
-- SELECT vault.create_secret('LONG_RANDOM_CRON_SECRET', 'autocare_sms_cron_secret');
-- The second secret MUST equal the Edge Function AUTOCARE_SMS_CRON_SECRET value.
-- Re-running this block updates the named job rather than creating duplicate jobs.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'autocare-service-progress-sms',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'autocare_sms_project_url' LIMIT 1)
           || '/functions/v1/autocare-progress-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-autocare-scheduler',
      (SELECT decrypted_secret FROM vault.decrypted_secrets
       WHERE name = 'autocare_sms_cron_secret' LIMIT 1)
    ),
    body := '{"mode":"send"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $job$
);
-- Verification commands:
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'autocare-service-progress-sms';
-- SELECT status, return_message, start_time FROM cron.job_run_details WHERE jobid =
--   (SELECT jobid FROM cron.job WHERE jobname = 'autocare-service-progress-sms')
-- ORDER BY start_time DESC LIMIT 20;
-- Check last HTTP errors (net._http_response may be truncated by retention settings):
-- SELECT status_code, error_msg, created FROM net._http_response ORDER BY created DESC LIMIT 20;
