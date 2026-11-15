/**
 * Pure, dependency-free progress SMS helpers shared by the Supabase Edge
 * Function and the Node.js tests. No phone numbers or credentials are logged.
 */
export function normalizePhilippinePhone(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('63')) local = local.slice(2);
  else if (local.startsWith('0')) local = local.slice(1);
  return /^9\d{9}$/.test(local) ? `+63${local}` : null;
}

function clean(value) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Split without dropping characters; the SMS provider handles GSM/UCS-2 segments. */
export function splitText(text, maxLength = 320) {
  if (!Number.isInteger(maxLength) || maxLength < 80) throw new Error('Invalid SMS segment length');
  const chars = Array.from(text);
  const chunks = [];
  let index = 0;
  while (index < chars.length) {
    let end = Math.min(index + maxLength, chars.length);
    if (end < chars.length) {
      const window = chars.slice(index, end).join('');
      const lineBreak = window.lastIndexOf('\n');
      const itemBreak = window.lastIndexOf('; ');
      const preferred = Math.max(lineBreak >= 0 ? lineBreak + 1 : 0, itemBreak >= 0 ? itemBreak + 2 : 0);
      if (preferred >= maxLength / 3) end = index + Array.from(window.slice(0, preferred)).length;
    }
    chunks.push(chars.slice(index, end).join(''));
    index = end;
  }
  return chunks.length ? chunks : [''];
}

export function buildProgressMessages(job) {
  const tasks = Array.isArray(job?.task_items) ? job.task_items : [];
  const buckets = { DONE: [], IN_PROGRESS: [], PENDING: [] };
  for (const task of tasks) {
    const title = clean(task?.title) || 'Untitled task';
    const state = String(task?.status ?? 'PENDING').trim().toUpperCase();
    if (state === 'DONE' || state === 'COMPLETED') buckets.DONE.push(title);
    else if (state === 'IN_PROGRESS') buckets.IN_PROGRESS.push(title);
    else buckets.PENDING.push(title);
  }
  const phase = job?.phase === 'UNDER_INSPECTION' ? 'Inspection' : 'Service';
  const lines = [
    `AutoCare #${clean(job?.tracking_number)} - ${phase} update`,
    `Completed (${buckets.DONE.length}/${tasks.length}): ${buckets.DONE.join('; ') || 'None'}`,
    `In progress (${buckets.IN_PROGRESS.length}): ${buckets.IN_PROGRESS.join('; ') || 'None'}`,
    `Not completed yet (${buckets.PENDING.length}): ${buckets.PENDING.join('; ') || 'None'}`,
  ];
  if (!tasks.length) lines.push('Tasks have not been recorded yet.');
  if (clean(job?.delay_reason)) lines.push(`Reported delay: ${clean(job.delay_reason)}`);
  const chunks = splitText(lines.join('\n'));
  return chunks.map((chunk, index) => chunks.length === 1
    ? chunk : `AutoCare part ${index + 1}/${chunks.length}\n${chunk}`);
}

export async function submitHttpSms({ to, from, content, apiKey, requestId, fetchImpl = fetch, timeoutMs = 12000 }) {
  if (!normalizePhilippinePhone(to)) throw new Error('Invalid recipient phone number');
  if (!normalizePhilippinePhone(from)) throw new Error('Invalid gateway phone number');
  if (typeof apiKey !== 'string' || !apiKey) throw new Error('httpSMS API key missing');
  if (!content?.trim()) throw new Error('SMS content missing');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ to: normalizePhilippinePhone(to), from: normalizePhilippinePhone(from), content, request_id: requestId }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status === 'error' || payload?.status === 'failed') {
      const message = String(payload?.message ?? '').slice(0, 120);
      throw new Error(`httpSMS HTTP ${response.status}${message ? `: ${message}` : ''}`);
    }
    // Submission acceptance is not proof of handset delivery.
    return { providerId: payload?.data?.id ?? null };
  } finally {
    clearTimeout(timer);
  }
}
