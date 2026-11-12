import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { getPaymongoPaymentIntent } from '@/lib/paymongo';
import { isValidUUID } from '@/utils/shared';
import { and, desc, eq, ne } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });

/**
 * Safe read-only payment-state endpoint. The server, never the browser, checks
 * PayMongo using the secret key. This does NOT settle invoices or issue receipts.
 * Verified payment settlement remains in the webhook and verify-payment route.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return json({ error: true, errorMessage: 'Invalid Final Cost ID.' }, 400);
  const requestedIntent = new URL(req.url).searchParams.get('paymentIntentId');
  if (requestedIntent && !/^pi_[A-Za-z0-9_-]{3,160}$/.test(requestedIntent)) {
    return json({ error: true, errorMessage: 'Invalid Payment Intent.' }, 400);
  }

  try {
    const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, id)).limit(1);
    if (!bill) return json({ error: true, errorMessage: 'Final Cost not found.' }, 404);
    const [appointment] = await Database.select({ customerId: Appointments.customerId })
      .from(Appointments).where(eq(Appointments.id, bill.appointmentId)).limit(1);
    if (!appointment || !(await canAccessQrPhBill(req, appointment.customerId))) {
      return json({ error: true, errorMessage: 'Not authorized to view this payment.' }, 403);
    }
    const where = requestedIntent
      ? and(eq(QrPhPaymentAttempts.finalBillId, id), eq(QrPhPaymentAttempts.paymentIntentId, requestedIntent))
      : eq(QrPhPaymentAttempts.finalBillId, id);
    const [attempt] = await Database.select().from(QrPhPaymentAttempts)
      .where(where).orderBy(desc(QrPhPaymentAttempts.createdAt)).limit(1);

    if (!attempt) return json({ error: false, data: { status: 'NONE', paid: bill.status === 'PAID', canRetry: true } });

    let status = attempt.status;
    let qrImageUrl: string | null = null;
    let qrTestUrl: string | null = null;
    const alreadyTerminal = ['SUCCEEDED', 'FAILED', 'EXPIRED'].includes(status);
    if (!alreadyTerminal) {
      try {
        const remote = await getPaymongoPaymentIntent(attempt.paymentIntentId);
        const attrs = remote?.data?.attributes ?? remote?.attributes ?? {};
        const nextAction = attrs?.next_action ?? {};
        qrImageUrl = typeof nextAction?.code?.image_url === 'string' ? nextAction.code.image_url : null;
        qrTestUrl = typeof (nextAction?.code?.test_url ?? nextAction?.test_url) === 'string' ? (nextAction?.code?.test_url ?? nextAction?.test_url) : null;
        const metadata = attrs.metadata ?? {};
        const remoteStatus = String(attrs.status ?? '').toLowerCase();
        // Never trust a Payment Intent that doesn't match this bill and amount.
        if (
          metadata.final_bill_id !== id ||
          Number(attrs.amount) !== attempt.amountCentavos ||
          String(attrs.currency ?? '').toUpperCase() !== 'PHP' ||
          !(Array.isArray(attrs.payment_method_allowed) && attrs.payment_method_allowed.includes('qrph'))
        ) {
          return json({ error: true, errorMessage: 'PayMongo payment verification mismatch.' }, 409);
        }
        if (remoteStatus === 'succeeded') status = 'SUCCEEDED';
        else if (remoteStatus === 'processing') status = 'PROCESSING';
        else if (remoteStatus === 'cancelled') status = 'EXPIRED';
        else if (remoteStatus === 'awaiting_next_action') {
          status = attempt.expiresAt.getTime() <= Date.now() ? 'EXPIRED' : 'PENDING';
        } else if (remoteStatus === 'awaiting_payment_method' && attempt.status !== 'INITIATED') {
          status = 'FAILED';
        }
        if (status !== attempt.status) {
          await Database.update(QrPhPaymentAttempts)
            .set({ status, updatedAt: new Date() })
            .where(and(eq(QrPhPaymentAttempts.id, attempt.id), ne(QrPhPaymentAttempts.status, 'SUCCEEDED')));
        }
      } catch (cause) {
        // Provider outage must not be interpreted as a failed payment.
        console.error('[QRPh] Provider status unavailable:', cause);
        return json({ error: true, errorMessage: 'Payment status is temporarily unavailable. Please retry.' }, 503);
      }
    }

    return json({ error: false, data: {
      status,
      paid: bill.status === 'PAID',
      canRetry: status === 'FAILED' || status === 'EXPIRED',
      expiresAt: attempt.expiresAt.toISOString(),
      qrImageUrl, qrTestUrl,
      // The client never receives the PayMongo secret/client key.
    } });
  } catch (cause) {
    console.error('[QRPh] Read status error:', cause);
    return json({ error: true, errorMessage: 'Unable to load QRPh payment status.' }, 500);
  }
}
