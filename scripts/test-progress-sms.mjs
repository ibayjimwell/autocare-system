#!/usr/bin/env node
/**
 * Node 20+ diagnostic and integration runner. No dependencies required.
 *
 * Usage:
 *   node scripts/test-progress-sms.mjs --self-test
 *   SUPABASE_URL=... AUTOCARE_SMS_CRON_SECRET=... node scripts/test-progress-sms.mjs --diagnose
 *   SUPABASE_URL=... AUTOCARE_SMS_CRON_SECRET=... node scripts/test-progress-sms.mjs --run-once --confirm
 *   HTTPSMS_API_KEY=... HTTPSMS_FROM_NUMBER=... node scripts/test-progress-sms.mjs --send-test --to +639XXXXXXXXX --confirm
 *
 * Do not paste secrets into Git, public terminals or screenshots.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { normalizePhilippinePhone, submitHttpSms } from '../supabase/functions/autocare-progress-sms/progress-core.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const selected = ['--self-test', '--diagnose', '--run-once', '--send-test'].filter(arg => args.includes(arg));
if (selected.length !== 1) {
  console.error('Select exactly one: --self-test, --diagnose, --run-once, --send-test');
  process.exit(2);
}
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; set it in your local terminal environment.`);
  return value;
}
function confirmLiveSideEffect() {
  if (!args.includes('--confirm')) throw new Error('This action sends real SMS requests. Add --confirm to proceed.');
}

try {
  if (args.includes('--self-test')) {
    const here = dirname(fileURLToPath(import.meta.url));
    const result = spawnSync(process.execPath, ['--test', resolve(here, '../tests/progress-sms.test.mjs')], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
  }
  if (args.includes('--diagnose') || args.includes('--run-once')) {
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
    if (!base) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. Load .env.local with node --env-file=.env.local.');
    if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(base)) throw new Error('Supabase URL must be the Supabase project HTTPS URL.');
    const secret = required('AUTOCARE_SMS_CRON_SECRET');
    if (args.includes('--run-once')) confirmLiveSideEffect();
    const mode = args.includes('--diagnose') ? 'diagnose' : 'send';
    const response = await fetch(`${base}/functions/v1/autocare-progress-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-autocare-scheduler': secret },
      body: JSON.stringify({ mode }),
      signal: AbortSignal.timeout(45000),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`Worker returned HTTP ${response.status} with a non-JSON response.`); }
    if (!response.ok) {
      if (response.status === 404 && json?.code === 'NOT_FOUND') {
        throw new Error('SMS Edge Function is not deployed in this Supabase project. Restore supabase/functions/autocare-progress-sms/index.ts and progress-core.mjs, then deploy it.');
      }
      throw new Error(`Worker HTTP ${response.status}: ${JSON.stringify(json)}`);
    }
    console.log(JSON.stringify(json, null, 2));
    if (mode === 'diagnose') {
      const health = json.health || {};
      if (!health.enabled) console.warn('ACTION: Enable SMS Updates in AutoCare Service Tracking.');
      if (json.missingWorkerSettings?.length) console.warn('ACTION: Configure these Supabase Edge Function secrets:', json.missingWorkerSettings.join(', '));
      if (json.gatewaySenderValid === false) console.warn('ACTION: Check HTTPSMS_FROM_NUMBER (Philippine +639 format).');
      if (health.invalidPhoneAppointments > 0) console.warn('ACTION: Some customers have invalid Philippine mobile numbers.');
      if (health.staleClaims > 0) console.warn('ACTION: SMS claims are stuck. Inspect Edge Function logs and cron runs.');
      console.log('NOTE: Diagnosing the worker does not prove the Supabase Cron schedule exists. Check cron.job and cron.job_run_details in SQL Editor.');
    } else if (json.failed > 0) process.exitCode = 1;
  }
  if (args.includes('--send-test')) {
    confirmLiveSideEffect();
    const to = normalizePhilippinePhone(option('--to'));
    if (!to) throw new Error('Provide a valid Philippine test recipient with --to +639XXXXXXXXX');
    const from = required('HTTPSMS_FROM_NUMBER');
    const apiKey = required('HTTPSMS_API_KEY');
    await submitHttpSms({
      to, from, apiKey, requestId: crypto.randomUUID(),
      content: `AutoCare SMS gateway connection check (${new Date().toISOString()}). No appointment data is included.`,
    });
    console.log('httpSMS accepted the diagnostic message. Check the gateway handset, message history, SIM and destination handset for actual delivery.');
  }
} catch (error) {
  console.error('FAILED:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
