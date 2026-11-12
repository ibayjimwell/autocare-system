/** Run: node tests/capstone-demo-payment.spec.cjs; isolated in-memory mocks; no live payments. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');

const billId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const customerId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
let bill = { id: billId, appointmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', grandTotal: '125.00', status: 'OFFICIAL' };
let minted = 0;
let receipts = [];
const FinalBill = { name: 'final' }, Appointments = { name: 'appointments' };
const QrPhPaymentAttempts = { name: 'qr' }, HostedCheckoutAttempts = { name: 'hosted' };
const PaymentTransactions = { name: 'transactions', id: 'transactionId', entityId: 'entityId', referenceNumber: 'referenceNumber', eventType: 'eventType' };
const closedRefs = new Set();
let currentReference = null;
const Database = { select: () => ({ from: table => ({ where: () => ({ limit: async () => {
  if (table === FinalBill) return [bill];
  if (table === Appointments) return [{ customerId }];
  if (table === PaymentTransactions) return closedRefs.has(currentReference) ? [{id:'closed'}] : [];
  return [];
} }) }) }), insert: () => ({ values: async obj => { closedRefs.add(obj.referenceNumber); } }) };
const json = (body, options) => ({ body, status: options?.status ?? 200 });
const mocks = {
  'node:crypto': crypto,
  'next/server': { NextResponse: { json } },
  'drizzle-orm': { eq: (col, val) => { if(col===PaymentTransactions.referenceNumber) currentReference=val; return true; }, and: () => true, inArray: () => true },
  '@/lib/drizzle': { Database },
  '@/database/models/payments/final-bill.model': { FinalBill },
  '@/database/models/appointments/appointments.model': { Appointments },
  '@/database/models/payments/qrph-payment-attempt.model': { QrPhPaymentAttempts },
  '@/database/models/payments/hosted-checkout-attempt.model': { HostedCheckoutAttempts },
  '@/database/models/payments/payment-transactions.model': { PaymentTransactions },
  '@/lib/payments/qrph-access': { canAccessQrPhBill: async (req, id) => req.userId === id },
  '@/lib/payments/hosted-checkout': {
    capstoneSimulationEnabled: () => process.env.AUTOCARE_CAPSTONE_DEMO === 'true' &&
      process.env.AUTOCARE_DEMO_DATABASE === 'true' &&
      process.env.PAYMONGO_SECRET_KEY?.startsWith('sk_test_') &&
      process.env.AUTOCARE_DEMO_CHECKOUT_SECRET?.length >= 32,
    billAmountInCentavos: val => Math.round(Number(val) * 100),
  },
  '@/utils/payments/generate-payment-receipt': { generatePaymentReceipt: async (id, opt) => {
    assert.equal(id, billId); assert.equal(opt.simulation, true);
    assert.equal(opt.expectedStatus, 'OFFICIAL');
    minted++; bill.status = 'PAID';
    const receiptData = { payment: { simulated: true, reference: opt.paymentReference } };
    receipts.push(receiptData);
    return { created: true, referenceNumber: 'SIM-MOCK-1234', receiptData };
  } },
  '@/utils/shared': { isValidUUID: val => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(val) },
};
const source = fs.readFileSync(path.join(__dirname,'../app/api/payments/final-bills/[id]/demo-payment/route.ts'), 'utf8');
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
Function('require','module','exports',transpiled)((name) => {
  if (!mocks[name]) throw new Error(`Unmocked dependency ${name}`); return mocks[name];
}, mod, mod.exports);
const handler = mod.exports;
const request = (body, auth = customerId) => ({ userId: auth, json: async () => body });
const params = { params: Promise.resolve({ id: billId }) };
const previous = Object.fromEntries(['AUTOCARE_CAPSTONE_DEMO','AUTOCARE_DEMO_DATABASE','PAYMONGO_SECRET_KEY','AUTOCARE_DEMO_CHECKOUT_SECRET']
  .map(x => [x, process.env[x]]));
(async () => {
  const off = await handler.GET(request(null), params);
  assert.equal(off.body.data.enabled, false);
  const disabled = await handler.POST(request({ action: 'start', paymentMethod: 'gcash' }), params);
  assert.equal(disabled.status, 404);
  Object.assign(process.env, {
    AUTOCARE_CAPSTONE_DEMO: 'true', AUTOCARE_DEMO_DATABASE: 'true',
    PAYMONGO_SECRET_KEY: 'sk_test_mockkey123',
    AUTOCARE_DEMO_CHECKOUT_SECRET: 'a-secret-for-testing-with-over-32-characters',
  });
  assert.equal((await handler.GET(request(null), params)).body.data.enabled, true);
  assert.equal((await handler.GET(request(null, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'), params)).status, 403);
  assert.equal((await handler.POST(request({ action: 'start', paymentMethod: 'unsafe' }), params)).status, 400);
  const started = await handler.POST(request({ action: 'start', paymentMethod: 'gcash' }), params);
  assert.equal(started.status, 200);
  assert.equal(started.body.data.amountCentavos, 12500);
  assert.equal(started.body.data.simulated, true);
  const token = started.body.data.token;
  assert.ok(token.includes('.'));
  assert.equal((await handler.POST(request({ action: 'complete', token: `${token}x` }), params)).status, 409);
  assert.equal(bill.status, 'OFFICIAL');
  const declined = await handler.POST(request({ action: 'decline', token }), params);
  assert.equal(declined.body.data.status, 'FAILED');
  assert.equal(bill.status, 'OFFICIAL');
  assert.equal((await handler.POST(request({ action: 'complete', token }), params)).status, 409, 'Declined tickets are revoked');
  const second = await handler.POST(request({ action: 'start', paymentMethod: 'gcash' }), params);
  const activeToken = second.body.data.token;
  const completed = await handler.POST(request({ action: 'complete', token: activeToken }), params);
  assert.equal(completed.status, 200);
  assert.equal(completed.body.data.paid, true);
  assert.equal(completed.body.data.simulated, true);
  assert.equal(bill.status, 'PAID');
  assert.equal(minted, 1);
  assert.equal(receipts[0].payment.simulated, true);
  const replay = await handler.POST(request({ action: 'complete', token: activeToken }), params);
  assert.equal(replay.status, 409);
  assert.equal(minted, 1);
  assert.equal((await handler.POST(request({ action: 'start', paymentMethod: 'paymaya' }), params)).status, 409);
  bill.status = 'OFFICIAL';
  const now = Date.now;
  const fresh = await handler.POST(request({ action: 'start', paymentMethod: 'card' }), params);
  Date.now = () => now() + 11 * 60 * 1000;
  assert.equal((await handler.POST(request({ action: 'complete', token: fresh.body.data.token }), params)).status, 409);
  Date.now = now;
  process.env.PAYMONGO_SECRET_KEY = 'sk_live_mockkey123';
  assert.equal((await handler.GET(request(null), params)).body.data.enabled, false);
  console.log('PASS 17 capstone simulation runtime assertions');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  for (const [k,v] of Object.entries(previous)) v === undefined ? delete process.env[k] : process.env[k] = v;
});
