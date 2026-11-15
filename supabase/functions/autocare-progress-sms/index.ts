/**
 * AutoCare service-progress SMS worker.
 * Called by Supabase Cron/pg_net, not Vercel or a connected web browser.
 * POST {} sends due updates; POST {"mode":"diagnose"} never sends SMS.
 * Both modes require x-autocare-scheduler (private secret).
 */
import { createClient } from 'npm:@supabase/supabase-js@2.110.0';
import { buildProgressMessages, normalizePhilippinePhone, submitHttpSms } from './progress-core.mjs';

type Job = {
  appointment_id: string;
  tracking_number: string;
  phone: string;
  phase: string;
  interval_bucket: string;
  task_items: Array<{ title?: string; status?: string }>;
  delay_reason: string | null;
};

const MAX_JOBS = 6;
const SUPPORTED_PHASES = ['UNDER_INSPECTION', 'IN_PROGRESS'];

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('AUTOCARE_SMS_CRON_SECRET');
  if (!secret || request.headers.get('x-autocare-scheduler') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* Cron sends an empty object. */ }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const mode = body.mode ?? 'send';
  if (mode !== 'send' && mode !== 'diagnose') {
    return Response.json({ error: 'Invalid worker mode.' }, { status: 400 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const smsKey = Deno.env.get('HTTPSMS_API_KEY');
  const from = Deno.env.get('HTTPSMS_FROM_NUMBER');
  const missing = [
    !url && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !smsKey && 'HTTPSMS_API_KEY',
    !from && 'HTTPSMS_FROM_NUMBER',
  ].filter(Boolean);
  if (!url || !serviceRoleKey) {
    return Response.json({ error: 'Missing database connection configuration.', missing }, { status: 503 });
  }
  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (mode === 'diagnose') {
    const { data, error } = await db.rpc('autocare_progress_sms_health');
    if (error) return Response.json({ error: 'Health RPC unavailable. Apply migration 0057.', code: error.code }, { status: 500 });
    return Response.json({ mode, health: data, missingWorkerSettings: missing, gatewaySenderValid: Boolean(normalizePhilippinePhone(from)) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (missing.length || !normalizePhilippinePhone(from)) {
    return Response.json({ error: 'SMS sender is not configured.', missing, gatewaySenderValid: Boolean(normalizePhilippinePhone(from)) }, { status: 503 });
  }

  const { data: jobs, error: claimError } = await db.rpc('autocare_claim_progress_sms', { p_limit: MAX_JOBS });
  if (claimError) {
    console.error('[AutoCare SMS] claim RPC failed:', claimError.code);
    return Response.json({ error: 'Could not claim due appointments.', code: claimError.code }, { status: 500 });
  }
  let submitted = 0;
  let failed = 0;
  const failures: Array<{ code: string; cause: string }> = [];
  for (const job of (jobs ?? []) as Job[]) {
    let status: 'SUBMITTED' | 'FAILED' = 'FAILED';
    let failure: string | null = null;
    try {
      const { data: appointment, error: statusError } = await db.from('appointments')
        .select('status').eq('id', job.appointment_id).single();
      if (statusError || !SUPPORTED_PHASES.includes(appointment?.status) || appointment.status !== job.phase) {
        throw new Error('Appointment status changed after claim.');
      }
      if (!normalizePhilippinePhone(job.phone)) throw new Error('Invalid destination number.');
      const messages = buildProgressMessages(job);
      for (const [partIndex, content] of messages.entries()) {
        await submitHttpSms({
          to: job.phone, from: from!, apiKey: smsKey!, content,
          // Each message part has its own traceable request ID.
          requestId: crypto.randomUUID(),
        });
      }
      status = 'SUBMITTED';
      submitted++;
    } catch (error) {
      failed++;
      failure = error instanceof Error ? error.message.slice(0, 250) : 'Unknown SMS error';
      failures.push({ code: 'SEND_FAILED', cause: failure });
      // Do not immediately retry: provider may have accepted one or more parts.
      console.error('[AutoCare SMS] update submission failed:', failure);
    }
    const { error: finalizeError } = await db.rpc('autocare_complete_progress_sms', {
      p_appointment_id: job.appointment_id,
      p_interval_bucket: job.interval_bucket,
      p_status: status,
      p_last_error: failure,
    });
    if (finalizeError) {
      console.error('[AutoCare SMS] finalize failed:', finalizeError.code);
      failures.push({ code: 'LOG_FAILED', cause: 'Unable to finalize SMS log.' });
    }
  }
  return Response.json({ mode, claimed: (jobs ?? []).length, submitted, failed, failures }, {
    headers: { 'Cache-Control': 'no-store' },
  });
});
