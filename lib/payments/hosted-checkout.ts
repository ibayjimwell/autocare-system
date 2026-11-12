import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';

export type HostedMethod = 'gcash' | 'paymaya' | 'card';
export const HOSTED_METHODS = ['gcash', 'paymaya', 'card'] as const;

function getSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim() ?? '';
  if (!/^sk_(test|live)_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('A valid PayMongo secret key is not configured on the server.');
  }
  return key;
}

export function paymongoIsLive(): boolean {
  return getSecretKey().startsWith('sk_live_');
}

function authHeader() {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString('base64')}`;
}

export class PayMongoRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'PayMongoRequestError';
  }
}

/** Never retry a payment-creation POST automatically: a timeout may still create a chargeable session. */
async function providerRequest(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://api.paymongo.com${path}`, {
      ...options,
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json', ...options.headers },
      cache: 'no-store', signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body?.errors?.[0]?.detail || body?.errors?.[0]?.code || 'PayMongo is temporarily unavailable.';
      throw new PayMongoRequestError(String(message), response.status);
    }
    if (!body?.data?.id) throw new Error('PayMongo returned an incomplete session response.');
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

export function billAmountInCentavos(input: unknown) {
  const raw = String(input ?? '').trim();
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(raw)) return 0;
  const [whole, fraction = ''] = raw.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : 0;
}

export function publicWebOrigin() {
  const raw = process.env.AUTOCARE_PUBLIC_BASE_URL || 'https://autocare-system.vercel.app';
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('AUTOCARE_PUBLIC_BASE_URL must be an HTTPS origin.');
  }
  return parsed.origin;
}

export async function createHostedCheckoutSession(args: {
  billId: string;
  reference: string;
  amountCentavos: number;
  method: HostedMethod;
}) {
  const origin = publicWebOrigin();
  const returnPath = `/api/payments/paymongo/checkout-return?billId=${encodeURIComponent(args.billId)}`;
  const resource = await providerRequest('/v2/checkout_sessions', {
    method: 'POST',
    body: JSON.stringify({ data: { attributes: {
      line_items: [{ name: 'AutoCare vehicle service – Final Cost', amount: args.amountCentavos, currency: 'PHP', quantity: 1 }],
      payment_method_types: [args.method],
      success_url: `${origin}${returnPath}&result=completed`,
      cancel_url: `${origin}${returnPath}&result=cancelled`,
      reference_number: args.reference,
      metadata: { final_bill_id: args.billId, autocare_checkout_reference: args.reference, payment_method: args.method },
      send_email_receipt: false,
      show_line_items: true,
    } } }),
  });
  const attrs = resource.attributes ?? {};
  if (!/^cs_[A-Za-z0-9_-]+$/.test(resource.id) ||
      typeof attrs.checkout_url !== 'string' ||
      !attrs.checkout_url.startsWith('https://checkout.paymongo.com/') ||
      attrs.livemode !== paymongoIsLive()) {
    throw new Error('PayMongo returned a checkout session with unexpected details.');
  }
  return { id: resource.id as string, checkoutUrl: attrs.checkout_url as string };
}

export async function getHostedCheckoutSession(checkoutSessionId: string) {
  if (!/^cs_[A-Za-z0-9_-]{3,160}$/.test(checkoutSessionId)) throw new Error('Invalid PayMongo Checkout Session ID.');
  return providerRequest(`/v2/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`);
}

export async function expireHostedCheckoutSession(checkoutSessionId: string) {
  if (!/^cs_[A-Za-z0-9_-]{3,160}$/.test(checkoutSessionId)) throw new Error('Invalid checkout session ID.');
  return providerRequest(`/v2/checkout_sessions/${encodeURIComponent(checkoutSessionId)}/expire`, { method: 'POST' });
}

/** Validates PayMongo's raw-body HMAC against the correct te/li signature. */
export function isVerifiedHostedWebhook(rawBody: string, header: string): boolean {
  const secret = (process.env.PAYMONGO_CHECKOUT_WEBHOOK_SECRET || '').trim();
  if (!secret || !header || rawBody.length > 200000) return false;
  const parts = Object.fromEntries(header.split(',').map(s => s.trim().split('=').map(v => v.trim())).filter(a => a.length === 2));
  const timestamp = Number(parts.t);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const signature = paymongoIsLive() ? parts.li : parts.te;
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(expected, received);
}

function getPaidPayment(resource: any) {
  const payments = resource?.attributes?.payments;
  if (!Array.isArray(payments)) return null;
  return payments.find((p: any) => p?.attributes?.status === 'paid') || null;
}

/** Resolve provider status, amount, method, mode and invoice BEFORE settlement. */
export async function reconcileHostedAttempt(attemptId: string) {
  const [attempt] = await Database.select().from(HostedCheckoutAttempts)
    .where(eq(HostedCheckoutAttempts.id, attemptId)).limit(1);
  if (!attempt || !attempt.checkoutSessionId) throw new Error('Checkout record not found.');
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, attempt.finalBillId)).limit(1);
  if (!bill) throw new Error('Final Cost not found.');

  if (attempt.status === 'PAID' || attempt.status === 'SIMULATED') {
    return { status: attempt.status, paid: bill.status === 'PAID', simulated: attempt.status === 'SIMULATED', livemode: attempt.livemode };
  }
  const resource = await getHostedCheckoutSession(attempt.checkoutSessionId);
  const attrs = resource.attributes ?? {};
  if (resource.id !== attempt.checkoutSessionId || attrs.livemode !== attempt.livemode ||
      attrs.livemode !== paymongoIsLive() || attrs.reference_number !== attempt.referenceNumber ||
      attrs.metadata?.final_bill_id !== attempt.finalBillId ||
      attrs.metadata?.autocare_checkout_reference !== attempt.referenceNumber ||
      attrs.metadata?.payment_method !== attempt.paymentMethod ||
      !Array.isArray(attrs.payment_method_types) || !attrs.payment_method_types.includes(attempt.paymentMethod) ||
      billAmountInCentavos(bill.grandTotal) !== attempt.amountCentavos) {
    throw new Error('Checkout verification mismatch. Contact AutoCare support before retrying.');
  }

  const payment = getPaidPayment(resource);
  if (payment) {
    const p = payment.attributes || {};
    // Provider confirms the *exact* amount received; no client-side success signal is accepted.
    if (String(p.currency).toUpperCase() !== 'PHP' || Number(p.amount) !== attempt.amountCentavos || !/^pay_[A-Za-z0-9_-]+$/.test(String(payment.id))) {
      throw new Error('The payment amount or currency could not be verified.');
    }
    if (attempt.livemode) {
      if (bill.status !== 'OFFICIAL' && bill.status !== 'PAID') throw new Error('Final Cost is not payable.');
      await generatePaymentReceipt(attempt.finalBillId, {
        paymentMethod: attempt.paymentMethod === 'paymaya' ? 'MAYA' : attempt.paymentMethod.toUpperCase(),
        paymentReference: payment.id, idempotent: true, expectedStatus: 'OFFICIAL',
      });
    }
    const status = attempt.livemode ? 'PAID' : 'SIMULATED';
    await Database.update(HostedCheckoutAttempts).set({ status, paymentId: payment.id, updatedAt: new Date() })
      .where(and(eq(HostedCheckoutAttempts.id, attempt.id), eq(HostedCheckoutAttempts.status, attempt.status)));
    return { status, paid: attempt.livemode, simulated: !attempt.livemode, livemode: attempt.livemode };
  }
  if (attrs.status === 'expired') {
    await Database.update(HostedCheckoutAttempts).set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(and(eq(HostedCheckoutAttempts.id, attempt.id), eq(HostedCheckoutAttempts.status, attempt.status)));
    return { status: 'EXPIRED', paid: bill.status === 'PAID', simulated: false, livemode: attempt.livemode };
  }
  return { status: 'PENDING', paid: bill.status === 'PAID', simulated: false, livemode: attempt.livemode };
}

export async function latestHostedAttempt(billId: string) {
  const [attempt] = await Database.select().from(HostedCheckoutAttempts)
    .where(eq(HostedCheckoutAttempts.finalBillId, billId))
    .orderBy(desc(HostedCheckoutAttempts.createdAt)).limit(1);
  return attempt ?? null;
}
