import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';
import { capstoneSimulationEnabled, billAmountInCentavos } from '@/lib/payments/hosted-checkout';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';
import { PaymentTransactions } from '@/database/models/payments/payment-transactions.model';
import { isValidUUID } from '@/utils/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const METHODS = new Set(['gcash', 'paymaya', 'card', 'qrph']);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const TTL_MS = 10 * 60 * 1000;

type Ticket = {
  v: 1; billId: string; customerId: string; amountCentavos: number;
  method: string; expires: number; nonce: string;
};

function sign(data: string) {
  return createHmac('sha256', process.env.AUTOCARE_DEMO_CHECKOUT_SECRET!).update(data).digest('base64url');
}

function issueTicket(ticket: Ticket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readTicket(token: unknown): Ticket | null {
  if (typeof token !== 'string' || token.length > 1600) return null;
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1]), 'utf8');
  const supplied = Buffer.from(match[2], 'utf8');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as Ticket;
    if (ticket.v !== 1 || !isValidUUID(ticket.billId) || !isValidUUID(ticket.customerId) ||
      !METHODS.has(ticket.method) || !Number.isSafeInteger(ticket.amountCentavos) ||
      ticket.amountCentavos <= 0 || !Number.isSafeInteger(ticket.expires) ||
      ticket.expires <= Date.now() || ticket.expires > Date.now() + TTL_MS ||
      !/^[a-f0-9-]{36}$/.test(ticket.nonce)) return null;
    return ticket;
  } catch { return null; }
}

async function ownedBill(req: NextRequest, id: string) {
  if (!isValidUUID(id)) return { error: json({ error: true, errorMessage: 'Invalid Final Cost ID.' }, 400) };
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, id)).limit(1);
  if (!bill) return { error: json({ error: true, errorMessage: 'Final Cost not found.' }, 404) };
  const [appointment] = await Database.select({ customerId: Appointments.customerId }).from(Appointments)
    .where(eq(Appointments.id, bill.appointmentId)).limit(1);
  if (!appointment || !(await canAccessQrPhBill(req, appointment.customerId))) {
    return { error: json({ error: true, errorMessage: 'Not authorized to access this Final Cost.' }, 403) };
  }
  return { bill, appointment };
}

// Prevent a second payment channel from starting while a real PayMongo attempt may still settle.
async function ensureNoOpenProviderAttempt(id: string) {
  const [qr] = await Database.select({ id: QrPhPaymentAttempts.id }).from(QrPhPaymentAttempts).where(and(
    eq(QrPhPaymentAttempts.finalBillId, id),
    inArray(QrPhPaymentAttempts.status, ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCEEDED']),
  )).limit(1);
  if (qr) return false;
  const [hosted] = await Database.select({ id: HostedCheckoutAttempts.id }).from(HostedCheckoutAttempts).where(and(
    eq(HostedCheckoutAttempts.finalBillId, id),
    inArray(HostedCheckoutAttempts.status, ['CREATING', 'CREATE_UNKNOWN', 'ACTIVE', 'PROCESSING']),
  )).limit(1);
  return !hosted;
}

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteProps) {
  if (!capstoneSimulationEnabled()) return json({ error: false, data: { enabled: false } });
  try {
    const { id } = await params;
    const result = await ownedBill(req, id);
    if (result.error) return result.error;
    return json({ error: false, data: {
      enabled: true, simulated: true, paid: result.bill!.status === 'PAID',
      status: result.bill!.status, currency: 'PHP',
    } });
  } catch (e) {
    console.error('[Capstone checkout] Check failed:', e);
    return json({ error: true, errorMessage: 'Unable to check demonstration checkout.' }, 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  if (!capstoneSimulationEnabled()) {
    return json({ error: true, errorMessage: 'Demonstration checkout is unavailable.' }, 404);
  }
  try {
    const { id } = await params;
    const result = await ownedBill(req, id);
    if (result.error) return result.error;
    const bill = result.bill!;
    const owner = result.appointment!;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: true, errorMessage: 'Invalid request.' }, 400);

    if (body.action === 'start') {
      if (bill.status !== 'OFFICIAL') return json({ error: true, errorMessage: 'Final Cost is not available for payment.' }, 409);
      if (!METHODS.has(body.paymentMethod)) return json({ error: true, errorMessage: 'Invalid payment method.' }, 400);
      const amountCentavos = billAmountInCentavos(bill.grandTotal);
      if (amountCentavos < 100) return json({ error: true, errorMessage: 'Invalid Final Cost amount.' }, 422);
      if (!(await ensureNoOpenProviderAttempt(id))) {
        return json({ error: true, errorMessage: 'An online checkout is still open. Cancel or resolve it before starting another payment.' }, 409);
      }
      const expires = Date.now() + TTL_MS;
      const nonce = randomUUID();
      const token = issueTicket({ v: 1, billId: id, customerId: owner.customerId,
        amountCentavos, method: body.paymentMethod, expires, nonce });
      return json({ error: false, data: { token, amountCentavos, paymentMethod: body.paymentMethod, expiresAt: new Date(expires).toISOString(), simulated: true } });
    }

    if (body.action !== 'complete' && body.action !== 'decline' && body.action !== 'cancel') {
      return json({ error: true, errorMessage: 'Invalid checkout action.' }, 400);
    }
    const ticket = readTicket(body.token);
    if (!ticket || ticket.billId !== id || ticket.customerId !== owner.customerId ||
      ticket.amountCentavos !== billAmountInCentavos(bill.grandTotal)) {
      return json({ error: true, errorMessage: 'Checkout expired or did not match this Final Cost.' }, 409);
    }
    const referenceNumber = `AUTOSIM-${ticket.nonce}`;
    // A failed/cancelled ticket cannot later be reused as successful checkout.
    const [closed] = await Database.select({ id: PaymentTransactions.id }).from(PaymentTransactions)
      .where(and(eq(PaymentTransactions.entityId, id), eq(PaymentTransactions.referenceNumber, referenceNumber),
        inArray(PaymentTransactions.eventType, ['DEMO_PAYMENT_DECLINED', 'DEMO_PAYMENT_CANCELLED'])))
      .limit(1);
    if (closed) return json({ error: true, errorMessage: 'This demonstration checkout has already been closed.' }, 409);

    if (body.action !== 'complete') {
      // Unlike best-effort audit logging, this record is mandatory: it revokes the ticket.
      await Database.insert(PaymentTransactions).values({
        entityType: 'FINAL_BILL', entityId: id, appointmentId: bill.appointmentId,
        eventType: body.action === 'decline' ? 'DEMO_PAYMENT_DECLINED' : 'DEMO_PAYMENT_CANCELLED',
        fromStatus: bill.status, toStatus: bill.status, amount: String(bill.grandTotal),
        paymentMethod: `DEMO_${ticket.method.toUpperCase()}`, referenceNumber,
        details: { simulated: true, noRealMoney: true },
      });
      return json({ error: false, data: { status: body.action === 'decline' ? 'FAILED' : 'CANCELLED', paid: false, simulated: true } });
    }
    if (bill.status !== 'OFFICIAL') {
      return json({ error: true, errorMessage: 'This Final Cost has already been settled or is no longer payable.' }, 409);
    }
    if (!(await ensureNoOpenProviderAttempt(id))) {
      return json({ error: true, errorMessage: 'Another online checkout is open. Resolve it before confirming this payment.' }, 409);
    }
    const receipt = await generatePaymentReceipt(id, {
      paymentMethod: `DEMO_${ticket.method === 'paymaya' ? 'MAYA' : ticket.method.toUpperCase()}`,
      paymentReference: referenceNumber,
      idempotent: true,
      expectedStatus: 'OFFICIAL',
      simulation: true,
      simulationSource: 'AUTOCARE_SIMULATOR',
    });
    if (receipt.receiptData?.payment?.simulated !== true || receipt.receiptData?.payment?.reference !== referenceNumber) {
      return json({ error: true, errorMessage: 'This Final Cost has already been settled through a different checkout.' }, 409);
    }
    return json({ error: false, data: { status: 'PAID', paid: true, simulated: true, referenceNumber: receipt.referenceNumber } });
  } catch (e) {
    console.error('[Capstone checkout] Payment failed:', e);
    return json({ error: true, errorMessage: e instanceof Error && /already paid|another request|not ready/i.test(e.message)
      ? 'This Final Cost has already been processed.' : 'Unable to process the demonstration payment.' }, 409);
  }
}
