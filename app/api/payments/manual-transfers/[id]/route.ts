import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { ManualTransferSubmissions } from '@/database/models/payments/manual-transfer-submissions.model';
import { Receipts } from '@/database/models/payments/receipts.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { and, eq, inArray } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { amountToCents, loadTransferBill } from '@/lib/payments/manual-transfer';
import { mobilePaymentsTriggers } from '@/app-triggers/payments';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';
import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';

type Context = { params: Promise<{ id: string }> };
function respond(errorMessage: string, status: number) {
  return NextResponse.json({ error: true, errorMessage }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return respond('Sign in required.', 401);
  if (session.user.access?.payments !== true) return respond('Payments permission required.', 403);
  const { id } = await params;
  if (!isValidUUID(id)) return respond('Invalid submission ID.', 400);
  let body: any;
  try { body = await req.json(); } catch { return respond('Invalid JSON.', 400); }
  const action = body?.action;
  if (action !== 'APPROVE' && action !== 'REJECT') return respond('Invalid review action.', 422);
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (note.length > 500) return respond('Review note is too long.', 422);
  if (action === 'REJECT' && note.length < 8) return respond('Provide a reason of at least 8 characters.', 422);

  try {
    const [item] = await Database.select().from(ManualTransferSubmissions)
      .where(eq(ManualTransferSubmissions.id, id)).limit(1);
    if (!item) return respond('Submission not found.', 404);
    const [bill] = await Database.select({ status: FinalBill.status, amount: FinalBill.grandTotal,
      appointmentId: FinalBill.appointmentId }).from(FinalBill).where(eq(FinalBill.id, item.finalBillId)).limit(1);
    if (!bill) return respond('Final Cost not found.', 404);

    if (action === 'REJECT') {
      if (item.status !== 'PENDING_REVIEW') return respond('Only pending submissions can be rejected.', 409);
      const [changed] = await Database.update(ManualTransferSubmissions).set({ status: 'REJECTED', staffNote: note,
        verifiedByStaffId: session.user.id, verifiedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(ManualTransferSubmissions.id, id), eq(ManualTransferSubmissions.status, 'PENDING_REVIEW'))).returning();
      if (!changed) return respond('Submission is already being reviewed.', 409);
      await recordPaymentTransaction({ entityType: 'FINAL_BILL', entityId: item.finalBillId,
        appointmentId: bill.appointmentId, eventType: 'MANUAL_TRANSFER_REJECTED', amount: item.amount,
        paymentMethod: item.method, referenceNumber: item.referenceNumber, actorStaffId: session.user.id,
        details: { submissionId: id, reason: note } });
      return NextResponse.json({ error: false, message: 'Transfer rejected. No payment was recorded.' });
    }

    // A reviewer MUST check incoming funds at the actual receiving institution.
    // Re-type the receiving institution's transaction reference and amount; never trust customer screenshots.
    const confirmedReference = String(body?.confirmedReference || '').trim().toUpperCase();
    if (confirmedReference !== item.referenceNumber) return respond('Confirmed bank/e-wallet reference does not match.', 422);
    if (amountToCents(String(body?.confirmedAmount ?? '')) !== amountToCents(item.amount))
      return respond('Confirmed received amount does not match the bill.', 422);
    if (body?.fundsConfirmed !== true) return respond('Confirm actual funds received in the destination account.', 422);

    const [existingReceipt] = await Database.select({ data: Receipts.data })
      .from(Receipts).where(eq(Receipts.finalBillId, item.finalBillId)).limit(1);
    if (item.status === 'VERIFYING') {
      // Recovery after a previous approval finalized its receipt but failed to update the review row.
      const payment = (existingReceipt?.data as any)?.payment;
      if (bill.status === 'PAID' && payment?.reference === item.referenceNumber &&
          payment?.method === `${item.method}_TRANSFER`) {
        await Database.update(ManualTransferSubmissions).set({ status: 'APPROVED',
          verifiedByStaffId: session.user.id, verifiedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(ManualTransferSubmissions.id, id), eq(ManualTransferSubmissions.status, 'VERIFYING')));
        return NextResponse.json({ error: false, message: 'Payment was already settled; review record recovered.' });
      }
      return respond('A prior verification is unresolved. Check transaction history and receipt before retrying.', 409);
    }
    if (item.status !== 'PENDING_REVIEW') return respond('This submission is no longer pending.', 409);
    if (existingReceipt || bill.status !== 'OFFICIAL') return respond('Bill already settled or no longer official. Check for duplicate funds.', 409);
    if (amountToCents(item.amount) !== amountToCents(bill.amount)) return respond('Bill total changed. Do not approve; reconcile and request a new transfer.', 409);

    // An older Mobile build may have started a PayMongo QRPh payment.
    // Never settle a manual transfer while that intent could still complete.
    // The QRPh attempts table is optional on installations that have not yet installed 0050.
    try {
      const qrAttempts = await Database.select({ status: QrPhPaymentAttempts.status, expiresAt: QrPhPaymentAttempts.expiresAt })
        .from(QrPhPaymentAttempts).where(and(eq(QrPhPaymentAttempts.finalBillId, item.finalBillId),
          inArray(QrPhPaymentAttempts.status, ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCEEDED'])))
        .limit(30);
      if (qrAttempts.some(row => row.status === 'SUCCEEDED' || row.expiresAt.getTime() > Date.now()))
        return respond('A PayMongo QRPh payment may still settle. Reconcile the provider payment before approving this transfer.', 409);
    } catch (e: any) {
      if (e?.code !== '42P01') throw e; // Older installations may not have QRPh attempt records.
    }

    const [claimed] = await Database.update(ManualTransferSubmissions)
      .set({ status: 'VERIFYING', updatedAt: new Date() })
      .where(and(eq(ManualTransferSubmissions.id, id), eq(ManualTransferSubmissions.status, 'PENDING_REVIEW'))).returning();
    if (!claimed) return respond('Someone else is reviewing this transfer.', 409);
    try {
      await generatePaymentReceipt(item.finalBillId, { paymentMethod: `${item.method}_TRANSFER`,
        paymentReference: item.referenceNumber, expectedStatus: 'OFFICIAL', idempotent: false });
      await Database.update(ManualTransferSubmissions).set({ status: 'APPROVED', staffNote: note || null,
        verifiedByStaffId: session.user.id, verifiedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(ManualTransferSubmissions.id, id), eq(ManualTransferSubmissions.status, 'VERIFYING')));
      await recordPaymentTransaction({ entityType: 'FINAL_BILL', entityId: item.finalBillId,
        appointmentId: bill.appointmentId, eventType: 'MANUAL_TRANSFER_VERIFIED',
        paymentMethod: `${item.method}_TRANSFER`, referenceNumber: item.referenceNumber,
        actorStaffId: session.user.id, amount: item.amount, details: { submissionId: id } });
      try {
        const paidBill = await loadTransferBill(item.finalBillId);
        if (paidBill) await mobilePaymentsTriggers.onFinalBillPaid({ customerId: paidBill.customerId,
          trackingNumber: paidBill.trackingNumber, appointmentId: bill.appointmentId, billId: item.finalBillId });
      } catch (notificationError) {
        console.error('[manual-transfer] Customer notification failed after successful receipt:', notificationError);
      }
      return NextResponse.json({ error: false, message: 'Funds verified. Bill paid and receipt generated.' });
    } catch (e) {
      console.error('[manual-transfer settlement]', e);
      // If the receipt wasn't committed, release the review claim for safe retry.
      // If a receipt WAS committed, keep VERIFYING for explicit staff recovery.
      const [receiptNow] = await Database.select({ id: Receipts.id }).from(Receipts)
        .where(eq(Receipts.finalBillId, item.finalBillId)).limit(1);
      if (!receiptNow) await Database.update(ManualTransferSubmissions).set({ status: 'PENDING_REVIEW', updatedAt: new Date() })
        .where(and(eq(ManualTransferSubmissions.id, id), eq(ManualTransferSubmissions.status, 'VERIFYING')));
      return respond('Payment processing could not be confirmed. Check bill/receipt before retrying.', 500);
    }
  } catch (e) {
    console.error('[manual-transfer review]', e);
    return respond('Transfer review failed. Please refresh and check the bill.', 500);
  }
}
