const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const mobileRoot = process.env.AUTOCARE_MOBILE_DIR ? path.resolve(process.env.AUTOCARE_MOBILE_DIR) : path.resolve(__dirname,'..','..','AutoCare Mobile');
const readMobile = (f) => fs.readFileSync(path.join(mobileRoot,f),'utf8');
const read = (f) => fs.readFileSync(path.join(base, f), 'utf8');

test('QRPh migration stores unique active intent per Final Cost and denies direct public reads', () => {
 const s=read('database/migrations/0050_qrph_payment_attempts.sql');
 assert.match(s,/CREATE UNIQUE INDEX IF NOT EXISTS qrph_one_active_attempt_per_bill/);
 assert.match(s,/WHERE status IN \('INITIATED','PENDING','PROCESSING'\)/);
 assert.match(s,/ENABLE ROW LEVEL SECURITY/);
});
test('QRPh server reads and writes provider attempts, using current final-bill money', () => {
 const s=read('app/api/payments/final-bills/[id]/pay-online/route.ts');
 assert.match(s,/amountCentavos:\s*amountInCentavos/);
 assert.match(s,/getPaymongoPaymentIntent\(activeAttempt\.paymentIntentId\)/);
 assert.match(s,/qrImageUrl:\s*image/);
 assert.match(s,/canAccessQrPhBill/);
});
test('status endpoint does not mark a Final Cost Paid or issue receipt', () => {
 const s=read('app/api/payments/final-bills/[id]/qrph-status/route.ts');
 assert.match(s,/getPaymongoPaymentIntent/);
 assert.match(s,/canAccessQrPhBill/);
 assert.doesNotMatch(s,/generatePaymentReceipt/);
 assert.doesNotMatch(s,/set\(\{\s*status:\s*'PAID'/);
});
test('verification and webhook retain server-side receipt path', () => {
 assert.match(read('app/api/payments/final-bills/[id]/verify-payment/route.ts'),/generatePaymentReceipt/);
 assert.match(read('app/api/payments/paymongo/webhook/route.ts'),/generatePaymentReceipt/);
 assert.match(read('app/api/payments/paymongo/webhook/route.ts'),/qrph\.expired/);
});
test('cash QR check-in is permanently retired, existing cash cashier retained', () => {
 assert.match(read('app/api/payments/counter-checkin/route.ts'),/410/);
 const page=read('app/(main)/payments/page.tsx');
 assert.doesNotMatch(page,/QRScannerModal/);
 const list=read('components/payments/FinalBillsList.tsx');
 assert.match(list,/Show QR Ph/);
 assert.match(list,/onPay\(bill\)/);
});
test('web list groups Official first and Paid separately', () => {
 const s=read('components/payments/FinalBillsList.tsx');
 assert.match(s,/OFFICIAL: 0/);
 assert.match(s,/Paid Final Costs/);
 assert.match(s,/paidExpanded/);
});
test('mobile Final Costs are organized and cash scanning no longer launches', () => {
 const s=readMobile('app/final-bills.jsx');
 assert.match(s,/OFFICIAL: 0/);
 assert.match(s,/showPaid/);
 const invoice=readMobile('app/invoice/[id].jsx');
 assert.match(invoice,/Cash at the Counter/);
 assert.match(invoice,/Save QR to Photos/);
 assert.doesNotMatch(invoice,/router\.push\('\/counter-scan/);
});
test('mobile uses provider status verification rather than a payment screenshot',()=>{
 const s=readMobile('hooks/usePaymentFlow.js');
 assert.match(s,/paymentsApi\.getQrPhStatus/);
 assert.match(s,/providerStatus === 'FAILED'/);
 assert.match(s,/paymentIntentData\?\.existing/);
});
test('both clients can resume existing payment QR',()=>{
 assert.match(read('hooks/payments/useQrPhPayment.ts'),/intent\?\.existing/);
 assert.match(readMobile('hooks/usePaymentFlow.js'),/paymentIntentData\?\.existing/);
});
