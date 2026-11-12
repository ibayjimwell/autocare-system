import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { PaypalCheckoutAttempts } from '@/database/models/payments/paypal-checkout-attempt.model';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';

// This integration is deliberately SANDBOX ONLY. No production PayPal endpoint is called.
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';
const TICKET_LIFETIME_MS = 60 * 60 * 1000;
export const OPEN_PAYPAL_STATUSES = ['READY','CREATING','ACTIVE','CAPTURING','CREATE_UNKNOWN'] as const;
const validTicket = (ticket: string) => /^[a-f0-9]{64}$/.test(ticket);
const validOrder = (id: string) => /^[A-Z0-9]{10,40}$/.test(id);
const validCapture = (id: string) => /^[A-Z0-9]{10,40}$/.test(id);

export function paypalSandboxEnabled() {
  return process.env.AUTOCARE_CAPSTONE_DEMO === 'true' &&
    process.env.AUTOCARE_DEMO_DATABASE === 'true' &&
    Boolean(process.env.PAYPAL_CLIENT_ID?.trim()) &&
    Boolean(process.env.PAYPAL_CLIENT_SECRET?.trim());
}
function assertConfigured() {
  if (!paypalSandboxEnabled()) throw new Error('PayPal sandbox is not configured for this capstone database.');
}
export function paypalClientId() { assertConfigured(); return process.env.PAYPAL_CLIENT_ID!.trim(); }
export function billCentavos(value: unknown): number {
  const s = String(value ?? '').trim();
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(s)) return 0;
  const [n, f=''] = s.split('.');
  const cents = Number(n) * 100 + Number(f.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : 0;
}
export function paypalSiteOrigin() {
  const url = new URL(process.env.AUTOCARE_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://autocare-system.vercel.app');
  if (!['https:', ...(process.env.NODE_ENV === 'development' ? ['http:'] : [])].includes(url.protocol) || url.username || url.password)
    throw new Error('Invalid AutoCare public payment origin.');
  return url.origin;
}

export class PaypalError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'PaypalError'; }
}
async function paypalToken(clientToken = false): Promise<string> {
  assertConfigured();
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID!.trim()}:${process.env.PAYPAL_CLIENT_SECRET!.trim()}`).toString('base64');
    const form = new URLSearchParams({ grant_type:'client_credentials' });
    if (clientToken) {
      form.set('response_type','client_token');
      form.set('intent','sdk_init');
      form.append('domains[]', new URL(paypalSiteOrigin()).hostname);
    }
    const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method:'POST', headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' },
      body:form.toString(), cache:'no-store', signal:ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new PaypalError('PayPal sandbox authentication failed. Check sandbox credentials and app permissions.', res.status);
    return json.access_token;
  } finally { clearTimeout(timer); }
}
export const paypalBrowserToken = () => paypalToken(true);
async function paypalRequest(path: string, method: 'GET'|'POST'='GET', payload?: unknown, requestId?: string) {
  const token = await paypalToken();
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${PAYPAL_API}${path}`, {
      method, cache:'no-store', signal:ctrl.signal,
      headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json',
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}) },
      ...(method === 'POST' ? { body:JSON.stringify(payload ?? {}) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json?.details?.[0]?.issue || json?.message || 'PayPal sandbox request failed.';
      throw new PaypalError(String(message), res.status);
    }
    return json;
  } finally { clearTimeout(timer); }
}

export async function latestPaypalAttempt(billId: string) {
  const [attempt] = await Database.select().from(PaypalCheckoutAttempts)
    .where(eq(PaypalCheckoutAttempts.finalBillId,billId))
    .orderBy(desc(PaypalCheckoutAttempts.createdAt)).limit(1);
  return attempt ?? null;
}
export async function getPaypalAttempt(ticket: string) {
  if (!validTicket(ticket)) return null;
  const [attempt] = await Database.select().from(PaypalCheckoutAttempts)
    .where(eq(PaypalCheckoutAttempts.ticket,ticket)).limit(1);
  return attempt ?? null;
}
export async function newPaypalAttempt(billId: string, amountCentavos: number) {
  assertConfigured();
  const token = randomBytes(32).toString('hex');
  const [attempt] = await Database.insert(PaypalCheckoutAttempts).values({
    finalBillId:billId, amountCentavos, ticket:token, currencyCode:'PHP', status:'READY',
    expiresAt: new Date(Date.now() + TICKET_LIFETIME_MS),
  }).returning();
  return { ...attempt, checkoutUrl:`${paypalSiteOrigin()}/paypal/checkout/${token}` };
}
export async function paypalCheckoutDetails(ticket: string) {
  assertConfigured();
  const attempt = await getPaypalAttempt(ticket);
  if (!attempt) throw new PaypalError('Checkout not found.',404);
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id,attempt.finalBillId)).limit(1);
  if (!bill) throw new PaypalError('Final Cost not found.',404);
  const expired = attempt.expiresAt.getTime() < Date.now();
  if (expired && attempt.status === 'READY') {
    await Database.update(PaypalCheckoutAttempts).set({status:'EXPIRED',updatedAt:new Date()})
      .where(and(eq(PaypalCheckoutAttempts.id,attempt.id),eq(PaypalCheckoutAttempts.status,'READY')));
  }
  return {attempt,bill,expired};
}
export async function ensurePaypalOrder(ticket: string) {
  const {attempt,bill,expired} = await paypalCheckoutDetails(ticket);
  if (expired && !attempt.orderId) throw new PaypalError('Checkout expired. Return to AutoCare for a new checkout.',410);
  if (bill.status !== 'OFFICIAL') throw new PaypalError('Final Cost is no longer payable.',409);
  if (billCentavos(bill.grandTotal) !== attempt.amountCentavos) throw new PaypalError('The Final Cost amount has changed.',409);
  if (attempt.orderId) return {id:attempt.orderId};
  if (!['READY','CREATE_UNKNOWN'].includes(attempt.status)) throw new PaypalError('Checkout is already being created. Try checking its status.',409);
  // Only one caller may start the remote order; CREATE_UNKNOWN is intentionally blocked
  // from creating a different order without manual reconciliation.
  if (attempt.status === 'CREATE_UNKNOWN') throw new PaypalError('Order status is uncertain. Contact AutoCare before retrying.',409);
  const claimed = await Database.update(PaypalCheckoutAttempts).set({status:'CREATING',updatedAt:new Date()})
    .where(and(eq(PaypalCheckoutAttempts.id,attempt.id),eq(PaypalCheckoutAttempts.status,'READY')))
    .returning({id:PaypalCheckoutAttempts.id});
  if (!claimed.length) throw new PaypalError('Another request is starting checkout.',409);
  try {
    const order = await paypalRequest('/v2/checkout/orders','POST',{
      intent:'CAPTURE',
      purchase_units:[{reference_id:attempt.id,custom_id:attempt.finalBillId,
        description:'AutoCare vehicle service – Final Cost',amount:{currency_code:'PHP',value:(attempt.amountCentavos/100).toFixed(2)}}],
      application_context:{shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW'},
    },attempt.id);
    if (!validOrder(order.id) || !['CREATED','PAYER_ACTION_REQUIRED','APPROVED'].includes(order.status)) throw new Error('PayPal returned an unexpected order response.');
    await Database.update(PaypalCheckoutAttempts).set({orderId:order.id,status:'ACTIVE',updatedAt:new Date()})
      .where(eq(PaypalCheckoutAttempts.id,attempt.id));
    return {id:order.id};
  } catch (error) {
    await Database.update(PaypalCheckoutAttempts).set({
      status:error instanceof PaypalError && error.status >= 400 && error.status < 500 ? 'FAILED' : 'CREATE_UNKNOWN',
      errorMessage:error instanceof Error ? error.message.slice(0,250) : 'Order creation failed',updatedAt:new Date(),
    }).where(eq(PaypalCheckoutAttempts.id,attempt.id));
    throw error;
  }
}

function completedCapture(order: any, attempt: typeof PaypalCheckoutAttempts.$inferSelect) {
  if (order?.id !== attempt.orderId || order?.status !== 'COMPLETED') return null;
  const units = order?.purchase_units;
  if (!Array.isArray(units) || units.length !== 1) throw new Error('PayPal order purchase units mismatch.');
  const unit = units[0];
  if (unit.custom_id !== attempt.finalBillId || unit.reference_id !== attempt.id ||
      unit.amount?.currency_code !== 'PHP' || billCentavos(unit.amount?.value) !== attempt.amountCentavos) {
    throw new Error('PayPal order amount or Final Cost reference mismatch.');
  }
  const captures = unit.payments?.captures;
  if (!Array.isArray(captures) || captures.length !== 1) throw new Error('PayPal capture details are missing.');
  const capture = captures[0];
  if (capture.status !== 'COMPLETED' || !validCapture(capture.id) ||
      capture.amount?.currency_code !== 'PHP' || billCentavos(capture.amount?.value) !== attempt.amountCentavos) {
    throw new Error('PayPal capture amount or status mismatch.');
  }
  return capture.id as string;
}
export async function reconcilePaypalAttempt(id: string) {
  assertConfigured();
  const [attempt] = await Database.select().from(PaypalCheckoutAttempts).where(eq(PaypalCheckoutAttempts.id,id)).limit(1);
  if (!attempt) throw new PaypalError('PayPal checkout not found.',404);
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id,attempt.finalBillId)).limit(1);
  if (!bill) throw new PaypalError('Final Cost not found.',404);
  if (attempt.status === 'DEMO_PAID' && bill.status === 'PAID') return {status:'DEMO_PAID',paid:true};
  if (!attempt.orderId) return {status:attempt.status,paid:false};
  const order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(attempt.orderId)}`);
  const captureId = completedCapture(order,attempt);
  if (!captureId) return {status:order.status === 'APPROVED' ? 'APPROVED' : attempt.status,paid:false};
  if (billCentavos(bill.grandTotal) !== attempt.amountCentavos) throw new Error('The Final Cost amount changed after checkout.');
  const result = await generatePaymentReceipt(attempt.finalBillId, {
    paymentMethod:'PAYPAL',paymentReference:captureId,expectedStatus:'OFFICIAL',idempotent:true,
    simulation:true,simulationSource:'PAYPAL_SANDBOX',
  });
  const record = result.receiptData?.payment;
  if (record?.reference !== captureId || record?.simulated !== true || record?.source !== 'PAYPAL_SANDBOX') {
    throw new Error('The Final Cost was settled by a different transaction.');
  }
  await Database.update(PaypalCheckoutAttempts).set({status:'DEMO_PAID',captureId,updatedAt:new Date()})
    .where(eq(PaypalCheckoutAttempts.id,attempt.id));
  return {status:'DEMO_PAID',paid:true};
}
export async function capturePaypalOrder(ticket: string, requestedOrderId: string) {
  const {attempt,bill} = await paypalCheckoutDetails(ticket);
  if (!attempt.orderId || requestedOrderId !== attempt.orderId || !validOrder(requestedOrderId))
    throw new PaypalError('The PayPal order does not match this checkout.',400);
  if (attempt.status === 'DEMO_PAID' && bill.status === 'PAID') return {status:'DEMO_PAID',paid:true};
  if (bill.status !== 'OFFICIAL') throw new PaypalError('Final Cost is no longer payable.',409);
  const alreadyCaptured = await reconcilePaypalAttempt(attempt.id);
  if (alreadyCaptured.paid) return alreadyCaptured;
  const order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(requestedOrderId)}`);
  if (order.status !== 'APPROVED') throw new PaypalError('Payment is not approved by PayPal.',409);
  if (order.purchase_units?.[0]?.custom_id !== attempt.finalBillId ||
      order.purchase_units?.[0]?.reference_id !== attempt.id ||
      billCentavos(order.purchase_units?.[0]?.amount?.value) !== attempt.amountCentavos ||
      order.purchase_units?.[0]?.amount?.currency_code !== 'PHP')
    throw new Error('PayPal order verification failed.');
  const claimed = await Database.update(PaypalCheckoutAttempts).set({status:'CAPTURING',updatedAt:new Date()})
    .where(and(eq(PaypalCheckoutAttempts.id,attempt.id),eq(PaypalCheckoutAttempts.status,'ACTIVE')))
    .returning({id:PaypalCheckoutAttempts.id});
  if (!claimed.length) throw new PaypalError('Checkout capture is already in progress. Check status shortly.',409);
  try {
    await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(requestedOrderId)}/capture`,'POST',{},attempt.id);
  } catch (error) {
    // Capture could succeed on PayPal even if response was lost. Never issue a
    // second capture blindly; re-fetch from PayPal before any retry.
    try { return await reconcilePaypalAttempt(attempt.id); }
    catch (verificationError) {
      await Database.update(PaypalCheckoutAttempts).set({status:'CREATE_UNKNOWN',updatedAt:new Date(),
        errorMessage:'Capture status uncertain; inspect PayPal order before retrying.'})
        .where(eq(PaypalCheckoutAttempts.id,attempt.id));
      throw verificationError;
    }
  }
  return reconcilePaypalAttempt(attempt.id);
}
