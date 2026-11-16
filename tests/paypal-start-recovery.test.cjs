'use strict';

// Isolated checkout-start state-machine tests. No network or live database needed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.join(__dirname, '../lib/payments/paypal-start.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

class MockPaypalError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function scenario(starting = []) {
  const attempts = starting.map(x => ({
    amountCentavos: 50000,
    expiresAt: new Date(Date.now() + 3600000),
    updatedAt: new Date(),
    finalBillId: 'bill',
    ticket: 'a'.repeat(64),
    ...x,
  }));
  let insertCalls = 0;
  let verifyCalls = 0;
  let paid = false;
  const model = {
    finalBillId: 'finalBillId', status: 'status', createdAt: 'createdAt',
    id: 'id', expiresAt: 'expiresAt',
  };
  const op = (name, ...args) => ({ name, args });
  const matches = (row, expression) => {
    if (expression.name === 'and') return expression.args.every(v => matches(row, v));
    if (expression.name === 'eq') return row[expression.args[0]] === expression.args[1];
    if (expression.name === 'lt') return row[expression.args[0]] < expression.args[1];
    if (expression.name === 'inArray') return expression.args[1].includes(row[expression.args[0]]);
    throw new Error('unexpected operator ' + expression.name);
  };
  const database = {
    select() {
      let clause = null;
      const q = {
        from() { return q; },
        where(x) { clause = x; return q; },
        orderBy() { return q; },
        limit(n) { return Promise.resolve(attempts.filter(x => matches(x, clause)).slice(0, n)); },
      };
      return q;
    },
    update() {
      let values, clause;
      const q = {
        set(x) { values = x; return q; },
        where(x) { clause = x; return q; },
        returning() {
          const found = attempts.filter(x => matches(x, clause));
          found.forEach(x => Object.assign(x, values));
          return Promise.resolve(found.map(x => ({ id: x.id })));
        },
      };
      return q;
    },
  };
  const paypal = {
    PaypalError: MockPaypalError,
    OPEN_PAYPAL_STATUSES: ['READY', 'CREATING', 'ACTIVE', 'CAPTURING', 'CREATE_UNKNOWN'],
    paypalSandboxEnabled: () => true,
    paypalSiteOrigin: () => 'https://autocare-system.vercel.app',
    reconcilePaypalAttempt: async () => { verifyCalls++; return { paid }; },
    newPaypalAttempt: async () => {
      insertCalls++;
      const created = {
        id: 'created-' + insertCalls, finalBillId: 'bill', amountCentavos: 50000,
        ticket: 'b'.repeat(64), status: 'READY',
        expiresAt: new Date(Date.now() + 3600000), updatedAt: new Date(),
      };
      attempts.push(created);
      return { ...created, checkoutUrl: `https://autocare-system.vercel.app/paypal/checkout/${created.ticket}` };
    },
  };
  const sandbox = {
    exports: {},
    require(id) {
      if (id === 'drizzle-orm') return {
        and: (...a) => op('and', ...a), eq: (...a) => op('eq', ...a),
        inArray: (...a) => op('inArray', ...a), lt: (...a) => op('lt', ...a),
        desc: x => x,
      };
      if (id === '@/lib/drizzle') return { Database: database };
      if (id === '@/database/models/payments/paypal-checkout-attempt.model') return { PaypalCheckoutAttempts: model };
      if (id === '@/lib/payments/paypal-sandbox') return paypal;
      throw new Error('Unexpected import ' + id);
    },
    Date,
  };
  vm.runInNewContext(compiled, sandbox, { filename: file });
  return {
    begin: sandbox.exports.beginPaypalCheckout,
    getOpen: sandbox.exports.getOpenPaypalAttempt,
    attempts,
    setPaid(x) { paid = x; },
    get inserts() { return insertCalls; },
    get verifies() { return verifyCalls; },
  };
}

test('creates a new sandbox checkout when there is no open attempt', async () => {
  const s = scenario();
  const res = await s.begin('bill', 50000);
  assert.equal(res.status, 'READY');
  assert.equal(res.reused, false);
  assert.equal(s.inserts, 1);
});

test('reuses an existing open attempt even with a newer FAILED history row', async () => {
  const s = scenario([
    { id: 'open', status: 'ACTIVE', orderId: 'ORDER123456789', createdAt: new Date(1) },
    { id: 'failed', status: 'FAILED', createdAt: new Date(2) },
  ]);
  const res = await s.begin('bill', 50000);
  assert.equal(res.reused, true);
  assert.equal(res.status, 'ACTIVE');
  assert.equal(s.verifies, 1);
  assert.equal(s.inserts, 0);
});

test('retires a READY attempt after expiration before creating another', async () => {
  const s = scenario([{
    id: 'old', status: 'READY', expiresAt: new Date(Date.now() - 1000),
  }]);
  const res = await s.begin('bill', 50000);
  assert.equal(s.attempts[0].status, 'EXPIRED');
  assert.equal(res.reused, false);
  assert.equal(s.inserts, 1);
});

test('reconciles expired ACTIVE orders before retiring them', async () => {
  const s = scenario([{
    id: 'old', status: 'ACTIVE', orderId: 'ORDER123456789',
    expiresAt: new Date(Date.now() - 1000),
  }]);
  const res = await s.begin('bill', 50000);
  assert.equal(s.verifies, 1);
  assert.equal(s.attempts[0].status, 'EXPIRED');
  assert.equal(res.reused, false);
});

test('never starts a second checkout after a captured order', async () => {
  const s = scenario([{
    id: 'old', status: 'ACTIVE', orderId: 'ORDER123456789',
  }]);
  s.setPaid(true);
  await assert.rejects(s.begin('bill', 50000), /already paid/);
  assert.equal(s.inserts, 0);
});

test('resumes an uncertain order creation with its original ticket', async () => {
  const s = scenario([{ id: 'old', status: 'CREATE_UNKNOWN' }]);
  const res = await s.begin('bill', 50000);
  assert.equal(res.reused, true);
  assert.equal(res.status, 'CREATE_UNKNOWN');
  assert.equal(s.inserts, 0);
});
