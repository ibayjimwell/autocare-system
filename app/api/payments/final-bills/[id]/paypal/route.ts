import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';
import { isValidUUID } from '@/utils/shared';
import {
  billCentavos,
  latestPaypalAttempt,
  paypalSandboxEnabled,
  paypalSiteOrigin,
  reconcilePaypalAttempt,
  OPEN_PAYPAL_STATUSES,
} from '@/lib/payments/paypal-sandbox';
import {
  beginPaypalCheckout,
  getOpenPaypalAttempt,
  paypalStartError,
} from '@/lib/payments/paypal-start';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const respond = (data: unknown, status = 200) => NextResponse.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store' },
});

async function customerBill(req: NextRequest, id: string) {
  if (!isValidUUID(id)) throw new Error('Invalid Final Cost reference.');

  const [bill] = await Database.select().from(FinalBill)
    .where(eq(FinalBill.id, id)).limit(1);
  if (!bill) throw new Error('Final Cost not found.');

  const [appointment] = await Database.select({ customerId: Appointments.customerId })
    .from(Appointments)
    .where(eq(Appointments.id, bill.appointmentId))
    .limit(1);
  if (!appointment || !(await canAccessQrPhBill(req, appointment.customerId))) {
    throw new Error('NOT_AUTHORIZED');
  }
  return bill;
}

function fail(error: unknown) {
  if ((error as Error)?.message === 'NOT_AUTHORIZED') {
    return respond({ error: true, errorMessage: 'Not authorized to access this Final Cost.' }, 403);
  }
  console.error('[Customer PayPal checkout]', error);
  const failure = paypalStartError(error);
  return respond({ error: true, code: failure.code, errorMessage: failure.errorMessage }, failure.status);
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const bill = await customerBill(req, id);

    // An older open attempt takes precedence over a newer failed attempt.
    const attempt = await getOpenPaypalAttempt(id) || await latestPaypalAttempt(id);
    if (!attempt) {
      return respond({ error: false, data: { status: 'NONE', paid: bill.status === 'PAID' } });
    }

    const state = await reconcilePaypalAttempt(attempt.id);
    const current = await getOpenPaypalAttempt(id);
    const active = current?.id === attempt.id && attempt.expiresAt.getTime() > Date.now();
    return respond({
      error: false,
      data: {
        ...state,
        checkoutUrl: active && OPEN_PAYPAL_STATUSES.includes(attempt.status as typeof OPEN_PAYPAL_STATUSES[number])
          ? `${paypalSiteOrigin()}/paypal/checkout/${attempt.ticket}`
          : null,
        provider: 'PAYPAL',
        sandbox: true,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    if (!paypalSandboxEnabled()) {
      return respond({ error: true, errorMessage: 'PayPal Sandbox is not configured on the server.' }, 503);
    }
    const { id } = await params;
    const bill = await customerBill(req, id);
    if (bill.status !== 'OFFICIAL') {
      return respond({ error: true, errorMessage: 'This Final Cost is not ready for payment.' }, 409);
    }

    // Preserve the original legacy provider guard: these payment methods may
    // have pending settlement records and must not be charged twice.
    const [oldCheckout] = await Database.select({ id: HostedCheckoutAttempts.id })
      .from(HostedCheckoutAttempts)
      .where(and(
        eq(HostedCheckoutAttempts.finalBillId, id),
        inArray(HostedCheckoutAttempts.status, ['CREATING', 'CREATE_UNKNOWN', 'ACTIVE', 'PROCESSING']),
      ))
      .limit(1);
    const [oldQr] = await Database.select({ id: QrPhPaymentAttempts.id })
      .from(QrPhPaymentAttempts)
      .where(and(
        eq(QrPhPaymentAttempts.finalBillId, id),
        inArray(QrPhPaymentAttempts.status, ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCEEDED']),
      ))
      .limit(1);
    if (oldCheckout || oldQr) {
      return respond({
        error: true,
        errorMessage: 'An earlier payment session needs reconciliation before opening PayPal checkout.',
      }, 409);
    }

    const amount = billCentavos(bill.grandTotal);
    const checkout = await beginPaypalCheckout(bill.id, amount);
    return respond({
      error: false,
      data: checkout,
    }, checkout.reused ? 200 : 201);
  } catch (error) {
    return fail(error);
  }
}
