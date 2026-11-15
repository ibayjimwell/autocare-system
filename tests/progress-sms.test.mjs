import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhilippinePhone, buildProgressMessages, splitText, submitHttpSms } from '../supabase/functions/autocare-progress-sms/progress-core.mjs';

const job = {
  tracking_number: 'AC-2026-0042', phase: 'UNDER_INSPECTION',
  task_items: [
    { title: 'Brake inspection', status: 'DONE' },
    { title: 'Computer scan', status: 'IN_PROGRESS' },
    { title: 'Final safety checks', status: 'PENDING' },
    { title: 'Road test', status: 'NOT_STARTED' },
  ],
};

test('mobile phone formats normalize correctly', () => {
  for (const input of ['09151234567', '9151234567', '639151234567', '+63 915 123 4567']) {
    assert.equal(normalizePhilippinePhone(input), '+639151234567');
  }
  assert.equal(normalizePhilippinePhone('12345'), null);
});

test('SMS contains completed, ongoing, and not-completed task names', () => {
  const parts = buildProgressMessages(job);
  const message = parts.join('');
  assert.match(message, /Inspection update/);
  assert.match(message, /Completed \(1\/4\): Brake inspection/);
  assert.match(message, /In progress \(1\): Computer scan/);
  assert.match(message, /Not completed yet \(2\): Final safety checks; Road test/);
});

test('IN_PROGRESS uses work tasks and includes delay reason', () => {
  const message = buildProgressMessages({ ...job, phase: 'IN_PROGRESS', delay_reason: 'Awaiting spare part' }).join('');
  assert.match(message, /Service update/);
  assert.match(message, /Reported delay: Awaiting spare part/);
});

test('no tasks still generates a useful progress SMS', () => {
  const message = buildProgressMessages({ ...job, task_items: [] }).join('');
  assert.match(message, /Tasks have not been recorded yet/);
});

test('long task summary splits without dropping its text', () => {
  const chunks = splitText('a'.repeat(920), 320);
  assert.deepEqual(chunks.map(c => c.length), [320, 320, 280]);
  assert.equal(chunks.join(''), 'a'.repeat(920));
  const messages = buildProgressMessages({ ...job, task_items: Array.from({length:30},(_,i)=>({title:`Task ${i} with considerable detailed information`,status:'PENDING'})) });
  assert.ok(messages.length > 1);
  assert.ok(messages.every((msg, i) => msg.includes(`AutoCare part ${i+1}/${messages.length}`)));
  const restored = messages.map(msg => msg.replace(/^AutoCare part \d+\/\d+\n/, '')).join('');
  for (let i = 0; i < 30; i++) assert.ok(restored.includes(`Task ${i} with considerable detailed information`));
});

test('httpSMS request uses correct provider method, headers and payload', async () => {
  let called = false;
  const response = await submitHttpSms({
    to: '09151234567', from: '+639161234567', content: 'Progress update', apiKey: 'fake', requestId: 'request-123',
    fetchImpl: async (url, options) => {
      called = true;
      assert.equal(url, 'https://api.httpsms.com/v1/messages/send');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['x-api-key'], 'fake');
      assert.deepEqual(JSON.parse(options.body), {
        to: '+639151234567', from: '+639161234567', content: 'Progress update', request_id: 'request-123',
      });
      return { ok: true, status: 200, json: async () => ({ status: 'success', data: { id: 'abc' } }) };
    },
  });
  assert.ok(called);
  assert.equal(response.providerId, 'abc');
});

test('provider failure is never reported as accepted', async () => {
  await assert.rejects(() => submitHttpSms({
    to: '+639151234567', from: '+639161234567', content: 'Text', apiKey: 'fake', requestId: 'abc',
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid key' }) }),
  }), /HTTP 401/);
});

test('invalid phone and blank content are rejected locally', async () => {
  await assert.rejects(() => submitHttpSms({ to: '123', from: '+639161234567', content: 'Text', apiKey: 'fake' }), /recipient/);
  await assert.rejects(() => submitHttpSms({ to: '+639151234567', from: '+639161234567', content: '', apiKey: 'fake' }), /content/);
});
