const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');
const previous = Object.fromEntries(['PAYMONGO_SECRET_KEY','AUTOCARE_CAPSTONE_DEMO','AUTOCARE_DEMO_DATABASE','AUTOCARE_DEMO_CHECKOUT_SECRET']
  .map(k => [k,process.env[k]]));
const attempt = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', finalBillId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  checkoutSessionId: 'cs_123456', referenceNumber: 'ref-123', amountCentavos: 15000, paymentMethod: 'gcash', livemode: false, status: 'ACTIVE' };
let currentAttempt = { ...attempt };
const bill = { id: attempt.finalBillId, grandTotal: '150.00', status: 'OFFICIAL' };
const hosted = {id:'hosted',finalBillId:'hostedbill',createdAt:'created',status:'status'};
const final = {id:'finalbill'};
let receiptOptions = null;
const Database = {
  select: () => ({ from: table => ({ where: () => ({ limit: async () => table === hosted ? [currentAttempt] : [bill],
    orderBy: () => ({limit: async () => [currentAttempt]}) }) }) }),
  update: () => ({set: values => ({where: async () => {Object.assign(currentAttempt, values)}})}),
};
const mocks = {
  'node:crypto': crypto, 'drizzle-orm': {eq:()=>true,and:()=>true,desc:()=>true},
  '@/lib/drizzle':{Database},
  '@/database/models/payments/hosted-checkout-attempt.model':{HostedCheckoutAttempts:hosted},
  '@/database/models/payments/final-bill.model':{FinalBill:final},
  '@/utils/payments/generate-payment-receipt':{generatePaymentReceipt:async(id, options) => {
    receiptOptions = options; bill.status = 'PAID';
    return {receiptData:{payment:{simulated:options.simulation===true,reference: options.paymentReference,source:options.simulation?'PAYMONGO_SANDBOX':'LIVE_OR_COUNTER'}}};
  }},
};
const src=fs.readFileSync(path.join(__dirname,'../lib/payments/hosted-checkout.ts'),'utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObj={exports:{}};
Function('require','module','exports',js)(name=>{if(!mocks[name])throw Error('Unknown '+name);return mocks[name]},moduleObj,moduleObj.exports);
const helper=moduleObj.exports;
const oldFetch=global.fetch;
(async()=>{
  Object.assign(process.env, {
    PAYMONGO_SECRET_KEY:'sk_test_fakekey456',AUTOCARE_CAPSTONE_DEMO:'true',AUTOCARE_DEMO_DATABASE:'true',
    AUTOCARE_DEMO_CHECKOUT_SECRET:'valid-secret-with-more-than-32-chars',
  });
  assert.equal(helper.capstoneSimulationEnabled(),true);
  global.fetch=async()=>({ok:true,json:async()=>({data:{id:'cs_123456',attributes:{
    livemode:false,reference_number:'ref-123',metadata:{final_bill_id:attempt.finalBillId,
      autocare_checkout_reference:'ref-123',payment_method:'gcash'},payment_method_types:['gcash'],
    payments:[{id:'pay_123456',attributes:{status:'paid',currency:'PHP',amount:15000}}],
  }}})});
  const result=await helper.reconcileHostedAttempt(attempt.id);
  assert.equal(result.status,'DEMO_PAID');assert.equal(result.paid,true);assert.equal(result.simulated,true);
  assert.equal(receiptOptions.simulation,true);assert.equal(receiptOptions.simulationSource,'PAYMONGO_SANDBOX');
  assert.equal(receiptOptions.paymentReference,'pay_123456');assert.equal(bill.status,'PAID');
  assert.equal(currentAttempt.status,'DEMO_PAID');
  const again=await helper.reconcileHostedAttempt(attempt.id); assert.equal(again.paid,true);
  process.env.PAYMONGO_SECRET_KEY='sk_live_fakekey456';
  assert.equal(helper.capstoneSimulationEnabled(),false);
  process.env.PAYMONGO_SECRET_KEY='sk_test_fakekey456';process.env.AUTOCARE_DEMO_DATABASE='false';
  assert.equal(helper.capstoneSimulationEnabled(),false);
  console.log('PASS 12 sandbox-to-demo settlement assertions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
  global.fetch=oldFetch;
  for(const [k,v] of Object.entries(previous))v===undefined?delete process.env[k]:process.env[k]=v;
});
