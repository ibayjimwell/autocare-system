import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { isValidUUID } from '@/utils/shared';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';
import { HOSTED_METHODS, type HostedMethod, PayMongoRequestError, billAmountInCentavos, createHostedCheckoutSession, expireHostedCheckoutSession, latestHostedAttempt, paymongoIsLive, reconcileHostedAttempt } from '@/lib/payments/hosted-checkout';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function authorizedBill(req: NextRequest, billId: string) {
  if (!isValidUUID(billId)) return { error: json({ error: true, errorMessage: 'Invalid Final Cost ID.' }, 400) };
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId)).limit(1);
  if (!bill) return { error: json({ error: true, errorMessage: 'Final Cost not found.' }, 404) };
  const [appointment] = await Database.select({ customerId: Appointments.customerId })
    .from(Appointments).where(eq(Appointments.id, bill.appointmentId)).limit(1);
  if (!appointment || !(await canAccessQrPhBill(req, appointment.customerId))) {
    return { error: json({ error: true, errorMessage: 'Not authorized to access this payment.' }, 403) };
  }
  return { bill };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await authorizedBill(req, id);
    if (result.error) return result.error;
    const attempt = await latestHostedAttempt(id);
    if (!attempt) return json({ error: false, data: { status: 'NONE', paid: result.bill?.status === 'PAID' } });
    if (!attempt.checkoutSessionId) return json({ error: false, data: { status: attempt.status, paymentMethod: attempt.paymentMethod, paid: false, livemode: attempt.livemode } });
    const status = await reconcileHostedAttempt(attempt.id);
    return json({ error: false, data: {
      ...status,
      checkoutSessionId: attempt.checkoutSessionId,
      checkoutUrl: status.status === 'PENDING' ? attempt.checkoutUrl : null,
      paymentMethod: attempt.paymentMethod,
    } });
  } catch (cause) {
    console.error('[Hosted checkout] Status error:', cause);
    return json({ error: true, errorMessage: cause instanceof Error ? cause.message : 'Unable to verify checkout.' }, 503);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await authorizedBill(req, id);
    if (result.error) return result.error;
    const bill = result.bill!;
    if (bill.status !== 'OFFICIAL') return json({ error: true, errorMessage: 'This Final Cost is not ready for payment.' }, 409);
    const body = await req.json().catch(() => null);
    const method = body?.paymentMethod;
    if (!HOSTED_METHODS.includes(method as HostedMethod)) {
      return json({ error: true, errorMessage: 'Select GCash, Maya or Credit/Debit Card.' }, 400);
    }
    const amount = billAmountInCentavos(bill.grandTotal);
    if (amount < 100 || amount > 9_999_999_99) return json({ error: true, errorMessage: 'Invalid Final Cost amount.' }, 422);
    if (method !== 'card' && amount > 10_000_000) {
      return json({ error: true, errorMessage: 'This wallet payment exceeds the allowed transaction amount.' }, 422);
    }

    // QR Ph's existing direct Payment Intent flow remains separate. Do not open
    // a second chargeable payment channel while a QR Ph attempt remains active.
    const [qrAttempt] = await Database.select({ id: QrPhPaymentAttempts.id })
      .from(QrPhPaymentAttempts).where(and(
        eq(QrPhPaymentAttempts.finalBillId, id),
        inArray(QrPhPaymentAttempts.status, ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCEEDED']),
      )).limit(1);
    if (qrAttempt) return json({ error: true, errorMessage: 'A QR Ph payment is already open. Complete or resolve it before selecting another method.' }, 409);

    const existing = await latestHostedAttempt(id);
    if (existing && ['CREATING','CREATE_UNKNOWN','ACTIVE','PROCESSING'].includes(existing.status)) {
      if (existing.paymentMethod === method && existing.checkoutUrl && existing.status === 'ACTIVE') {
        const remote = await reconcileHostedAttempt(existing.id);
        if (remote.status === 'PENDING') return json({ error: false, data: {
          checkoutSessionId: existing.checkoutSessionId, checkoutUrl: existing.checkoutUrl,
          paymentMethod: method, livemode: existing.livemode, reused: true,
        } });
        if (remote.status === 'PAID') return json({ error: true, errorMessage: 'This Final Cost has already been paid.' }, 409);
      } else {
        return json({ error: true, errorMessage: existing.status === 'CREATE_UNKNOWN'
          ? 'The previous checkout is being reviewed. Please contact AutoCare before trying again.'
          : 'Another payment session is open. Finish or cancel that checkout before selecting a different method.' }, 409);
      }
    }

    const reference = `AC-${randomUUID()}`;
    const livemode = paymongoIsLive();
    let createdId: string;
    try {
      const [created] = await Database.insert(HostedCheckoutAttempts).values({
        finalBillId: id, referenceNumber: reference, amountCentavos: amount,
        paymentMethod: method, livemode, status: 'CREATING',
      }).returning({ id: HostedCheckoutAttempts.id });
      createdId = created.id;
    } catch (cause: any) {
      if (cause?.code === '23505' || /duplicate key/i.test(String(cause?.message))) {
        return json({ error: true, errorMessage: 'A checkout is already being created for this Final Cost.' }, 409);
      }
      throw cause;
    }

    // Creation POST can time out after PayMongo has actually created a checkout.
    // CREATE_UNKNOWN deliberately blocks a second chargeable session until reviewed.
    try {
      const session = await createHostedCheckoutSession({
        billId: id, reference, amountCentavos: amount, method,
      });
      await Database.update(HostedCheckoutAttempts).set({
        checkoutSessionId: session.id, checkoutUrl: session.checkoutUrl,
        status: 'ACTIVE', updatedAt: new Date(),
      }).where(eq(HostedCheckoutAttempts.id, createdId));
      return json({ error: false, data: {
        checkoutSessionId: session.id, checkoutUrl: session.checkoutUrl, paymentMethod: method, livemode,
      } }, 201);
    } catch (cause) {
      await Database.update(HostedCheckoutAttempts).set({
        status: cause instanceof PayMongoRequestError && cause.status >= 400 && cause.status < 500 ? 'FAILED' : 'CREATE_UNKNOWN',
        errorMessage: cause instanceof Error ? cause.message.slice(0, 300) : 'Provider request failed',
        updatedAt: new Date(),
      }).where(eq(HostedCheckoutAttempts.id, createdId));
      throw cause;
    }
  } catch (cause) {
    console.error('[Hosted checkout] Start error:', cause);
    return json({ error: true, errorMessage: cause instanceof Error ? cause.message : 'Unable to start payment.' }, 503);
  }
}

/** Explicit customer cancellation: PayMongo, not the app, must confirm expiry. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await authorizedBill(req, id);
    if (result.error) return result.error;
    const attempt = await latestHostedAttempt(id);
    if (!attempt || !attempt.checkoutSessionId || attempt.status !== 'ACTIVE') {
      return json({ error: true, errorMessage: 'No active checkout to cancel.' }, 409);
    }
    const reconciled = await reconcileHostedAttempt(attempt.id);
    if (reconciled.status !== 'PENDING') return json({ error: true, errorMessage: 'The payment is already completed or expired.' }, 409);
    await expireHostedCheckoutSession(attempt.checkoutSessionId);
    await Database.update(HostedCheckoutAttempts).set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(and(eq(HostedCheckoutAttempts.id, attempt.id), eq(HostedCheckoutAttempts.status, 'ACTIVE')));
    return json({ error: false, data: { status: 'EXPIRED' } });
  } catch (cause) {
    console.error('[Hosted checkout] Cancel error:', cause);
    return json({ error: true, errorMessage: 'PayMongo could not cancel this session. Check the payment status before retrying.' }, 409);
  }
}
