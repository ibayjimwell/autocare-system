/** Local integration-contract checks, with mocked provider and database.
 * Run: node tests/paymongo-hosted-checkout.spec.cjs
 * These do not charge money or connect to a live database.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const attempt = {
  id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  finalBillId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  checkoutSessionId:'cs_ABC1234', referenceNumber:'AC-test-reference',
  amountCentavos:12500, paymentMethod:'gcash', livemode:false, status:'ACTIVE',
};
const bill = { grandTotal:'125.00', status:'OFFICIAL' };
let providerResource = null;
let receiptCalls = 0;
const attempts = [{ ...attempt }];
const Database = {
  select: () => ({ from: table => ({ where: () => ({ limit: async () => table?.id === 'attemptsId' ? attempts.slice(0, 1) : [bill],
    orderBy: () => ({limit: async () => attempts.slice(0, 1) }) }), orderBy: () => ({limit: async () => attempts.slice(0, 1)}) }) }),
  update: () => ({ set: values => ({where: async () => { Object.assign(attempts[0],values); }}) }),
};
const mocks = {
  'node:crypto':crypto,
  'drizzle-orm': {eq:()=>null,and:()=>null,desc:()=>null},
  '@/lib/drizzle':{Database},
  '@/database/models/payments/hosted-checkout-attempt.model':{HostedCheckoutAttempts:{id:'attemptsId',finalBillId:'bill',createdAt:'created',status:'status'}},
  '@/database/models/payments/final-bill.model':{FinalBill:{id:'id'}},
  '@/utils/payments/generate-payment-receipt': {generatePaymentReceipt:async (billId, options) => { receiptCalls++; bill.status='PAID'; return {created:true, receiptData:{payment:{reference:options.paymentReference, simulated:options.simulation===true, source:options.simulation?'PAYMONGO_SANDBOX':'LIVE_OR_COUNTER'}}}; }},
};
const source=fs.readFileSync(path.join(__dirname,'../lib/payments/hosted-checkout.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
Function('require','module','exports',js)((name)=>{if(!mocks[name])throw Error('Unmocked module '+name);return mocks[name];},mod,mod.exports);
const helper=mod.exports;
const origFetch=global.fetch;
const savedKey=process.env.PAYMONGO_SECRET_KEY;
const savedWebhook=process.env.PAYMONGO_CHECKOUT_WEBHOOK_SECRET;
(async()=>{
  process.env.PAYMONGO_SECRET_KEY='sk_test_mockkey123';
  process.env.PAYMONGO_CHECKOUT_WEBHOOK_SECRET='mock-wh-secret';
  assert.equal(helper.billAmountInCentavos('125.00'),12500);
  assert.equal(helper.billAmountInCentavos('0.99'),99);
  assert.equal(helper.billAmountInCentavos('12.349'),0);
  assert.equal(helper.billAmountInCentavos('-1'),0);
  assert.equal(helper.billAmountInCentavos('abc'),0);
  assert.equal(helper.billAmountInCentavos('9999999.99'),999999999);
  const timestamp=Math.round(Date.now()/1000);
  const raw='{"demo":true}';
  const signature=crypto.createHmac('sha256','mock-wh-secret').update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(helper.isVerifiedHostedWebhook(raw,`t=${timestamp},te=${signature},li=`),true);
  assert.equal(helper.isVerifiedHostedWebhook(raw,`t=${timestamp},li=${signature},te=`),false);
  assert.equal(helper.isVerifiedHostedWebhook(raw,`t=${timestamp-400},te=${signature},li=`),false);
  assert.equal(helper.isVerifiedHostedWebhook(raw+'x',`t=${timestamp},te=${signature},li=`),false);

  let createBody;
  global.fetch=async(url,opt)=>{
    if(opt.method==='POST') {
      createBody=JSON.parse(opt.body); assert.match(url,/\/v2\/checkout_sessions$/);
      return {ok:true,json:async()=>({data:{id:'cs_ABC1234',attributes:{checkout_url:'https://checkout.paymongo.com/abcdef',livemode:false}}})};
    }
    return {ok:true,json:async()=>({data:providerResource})};
  };
  const created=await helper.createHostedCheckoutSession({billId:attempt.finalBillId,reference:attempt.referenceNumber,amountCentavos:12500,method:'gcash'});
  assert.equal(created.id,attempt.checkoutSessionId);
  assert.deepEqual(createBody.data.attributes.payment_method_types,['gcash']);
  assert.equal(createBody.data.attributes.line_items[0].amount,12500);
  assert.match(createBody.data.attributes.success_url,/checkout-return\?billId=/);

  providerResource={id:attempt.checkoutSessionId,attributes:{livemode:false,
    reference_number:attempt.referenceNumber,metadata:{final_bill_id:attempt.finalBillId,autocare_checkout_reference:attempt.referenceNumber,payment_method:'gcash'},
    payment_method_types:['gcash'],status:'active',payments:[{id:'pay_123456',attributes:{status:'paid',currency:'PHP',amount:12500}}]}};
  const testResult=await helper.reconcileHostedAttempt(attempt.id);
  assert.equal(testResult.status,'SIMULATED');
  assert.equal(testResult.paid,false);
  assert.equal(receiptCalls,0,'Sandbox checkout MUST NOT mark a real invoice paid');

  attempts[0]={...attempt};
  providerResource.attributes.payments[0].attributes.amount=13000;
  await assert.rejects(()=>helper.reconcileHostedAttempt(attempt.id),/amount or currency/);
  assert.equal(receiptCalls,0);

  attempts[0]={...attempt,livemode:true};
  process.env.PAYMONGO_SECRET_KEY='sk_live_mockkey123';
  providerResource.attributes.livemode=true;
  providerResource.attributes.payments[0].attributes.amount=12500;
  const liveResult=await helper.reconcileHostedAttempt(attempt.id);
  assert.equal(liveResult.status,'PAID');
  assert.equal(receiptCalls,1);
  assert.equal(attempts[0].status,'PAID');
  const signatureLive=crypto.createHmac('sha256','mock-wh-secret').update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(helper.isVerifiedHostedWebhook(raw,`t=${timestamp},te=,li=${signatureLive}`),true);
  console.log('PASS 18 mocked contract assertions: amount, signature, checkout creation, sandbox, mismatch, live receipt');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
  global.fetch=origFetch;
  if(savedKey===undefined)delete process.env.PAYMONGO_SECRET_KEY;else process.env.PAYMONGO_SECRET_KEY=savedKey;
  if(savedWebhook===undefined)delete process.env.PAYMONGO_CHECKOUT_WEBHOOK_SECRET;else process.env.PAYMONGO_CHECKOUT_WEBHOOK_SECRET=savedWebhook;
});
