/**
 * Regression: A verified PayMongo sandbox payment initially saved as
 * SIMULATED must be safely promotable to a demo PAID Final Cost after the
 * operator enables capstone settlement on an isolated database.
 *
 * Run: node tests/capstone-sandbox-promotion.spec.cjs
 * Uses mocked PayMongo and database; does not transfer money.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');

const envKeys = ['PAYMONGO_SECRET_KEY', 'AUTOCARE_CAPSTONE_DEMO',
  'AUTOCARE_DEMO_DATABASE', 'AUTOCARE_DEMO_CHECKOUT_SECRET'];
const previous = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));
const previousFetch = global.fetch;
const attemptId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const billId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const initialAttempt = {
  id: attemptId, finalBillId: billId, checkoutSessionId: 'cs_sandbox_123',
  referenceNumber: 'AC-verified', amountCentavos: 1000,
  paymentMethod: 'gcash', livemode: false, status: 'ACTIVE',
};
let attempt = { ...initialAttempt };
let bill = { id: billId, grandTotal: '10.00', status: 'OFFICIAL' };
let paymentReference = 'pay_verified_test';
let receiptResponse = null;
let receiptCalls = 0;
let providerCalls = 0;
const attempts = { id: 'attempts' };
const bills = { id: 'bills' };
const Database = {
  select: () => ({
    from: table => ({
      where: () => ({
        limit: async () => table === attempts ? [attempt] : [bill],
        orderBy: () => ({ limit: async () => [attempt] }),
      }),
    }),
  }),
  update: () => ({ set: values => ({ where: async () => Object.assign(attempt, values) }) }),
};
const mocks = {
  'node:crypto': crypto,
  'drizzle-orm': { eq: () => null, and: () => null, desc: () => null },
  '@/lib/drizzle': { Database },
  '@/database/models/payments/hosted-checkout-attempt.model': { HostedCheckoutAttempts: attempts },
  '@/database/models/payments/final-bill.model': { FinalBill: bills },
  '@/utils/payments/generate-payment-receipt': {
    generatePaymentReceipt: async (id, options) => {
      assert.equal(id, billId);
      receiptCalls++;
      if (receiptResponse) return receiptResponse;
      bill.status = 'PAID';
      return { receiptData: { payment: {
        reference: options.paymentReference,
        simulated: options.simulation,
        source: options.simulationSource,
      } } };
    },
  },
};
const source = fs.readFileSync(path.join(__dirname, '../lib/payments/hosted-checkout.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
Function('require', 'module', 'exports', compiled)(name => {
  if (!(name in mocks)) throw Error(`Unexpected module ${name}`);
  return mocks[name];
}, mod, mod.exports);
const { reconcileHostedAttempt, capstoneSimulationEnabled } = mod.exports;

const setDemoFlags = enabled => {
  process.env.PAYMONGO_SECRET_KEY = 'sk_test_capstone_only';
  process.env.AUTOCARE_CAPSTONE_DEMO = 'true';
  process.env.AUTOCARE_DEMO_DATABASE = enabled ? 'true' : 'false';
  process.env.AUTOCARE_DEMO_CHECKOUT_SECRET = 'capstone-only-secret-with-40-or-more-characters';
};
const reset = status => {
  attempt = { ...initialAttempt, status };
  bill = { id: billId, grandTotal: '10.00', status: 'OFFICIAL' };
  paymentReference = 'pay_verified_test';
  receiptResponse = null;
  receiptCalls = 0;
  providerCalls = 0;
};

global.fetch = async () => {
  providerCalls++;
  return { ok: true, json: async () => ({
    data: { id: attempt.checkoutSessionId, attributes: {
      livemode: false, reference_number: attempt.referenceNumber,
      metadata: { final_bill_id: billId, autocare_checkout_reference: attempt.referenceNumber, payment_method: 'gcash' },
      payment_method_types: ['gcash'],
      payments: [{ id: paymentReference, attributes: { status: 'paid', currency: 'PHP', amount: 1000 } }],
    } },
  }) };
};

(async () => {
  // First payment happened before the demo flags were configured.
  reset('ACTIVE');
  setDemoFlags(false);
  assert.equal(capstoneSimulationEnabled(), false);
  const first = await reconcileHostedAttempt(attemptId);
  assert.equal(first.status, 'SIMULATED');
  assert.equal(first.paid, false);
  assert.equal(bill.status, 'OFFICIAL');
  assert.equal(receiptCalls, 0);

  // A later poll still cannot credit it while the app is not isolated.
  const before = providerCalls;
  const blocked = await reconcileHostedAttempt(attemptId);
  assert.equal(blocked.status, 'SIMULATED');
  assert.equal(blocked.paid, false);
  assert.equal(providerCalls, before, 'Do not query provider unnecessarily when demo is disabled');

  // Configure the isolated demo environment, then press Check Payment Status.
  setDemoFlags(true);
  assert.equal(capstoneSimulationEnabled(), true);
  const promoted = await reconcileHostedAttempt(attemptId);
  assert.equal(promoted.status, 'DEMO_PAID');
  assert.equal(promoted.paid, true);
  assert.equal(promoted.simulated, true);
  assert.equal(bill.status, 'PAID');
  assert.equal(attempt.status, 'DEMO_PAID');
  assert.equal(receiptCalls, 1);
  const after = providerCalls;
  const repeated = await reconcileHostedAttempt(attemptId);
  assert.equal(repeated.paid, true);
  assert.equal(receiptCalls, 1, 'Repeated checks must not create receipts');
  assert.equal(providerCalls, after, 'Completed attempts do not require additional PayMongo requests');

  // Provider mismatch must not credit the Final Cost.
  reset('SIMULATED');
  setDemoFlags(true);
  paymentReference = 'invalid_payment_reference';
  await assert.rejects(() => reconcileHostedAttempt(attemptId), /payment amount or currency/i);
  assert.equal(bill.status, 'OFFICIAL');
  assert.equal(attempt.status, 'SIMULATED');
  assert.equal(receiptCalls, 0);

  // Idempotency must not attach somebody else's receipt to this checkout.
  reset('SIMULATED');
  receiptResponse = { receiptData: { payment: { reference: 'pay_other', simulated: true, source: 'PAYMONGO_SANDBOX' } } };
  await assert.rejects(() => reconcileHostedAttempt(attemptId), /another payment channel/i);
  assert.equal(attempt.status, 'SIMULATED');

  // Live credentials disable the demo settlement path.
  reset('SIMULATED');
  process.env.PAYMONGO_SECRET_KEY = 'sk_live_real_provider';
  assert.equal(capstoneSimulationEnabled(), false);
  await reconcileHostedAttempt(attemptId);
  assert.equal(attempt.status, 'SIMULATED');
  assert.equal(bill.status, 'OFFICIAL');

  console.log('PASS sandbox promotion, isolation, mismatches and replay checks');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  global.fetch = previousFetch;
  for (const [k, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[k];
    else process.env[k] = value;
  }
});
