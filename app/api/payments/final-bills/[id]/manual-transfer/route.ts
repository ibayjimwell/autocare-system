import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { isValidUUID } from '@/utils/shared';
import { ManualTransferSubmissions } from '@/database/models/payments/manual-transfer-submissions.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { amountToCents, getTransferDestinations, loadTransferBill, type TransferMethod } from '@/lib/payments/manual-transfer';
import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';

const headers = { 'Cache-Control': 'private, no-store' };
type Context = { params: Promise<{ id: string }> };

async function ownedBill(req: NextRequest, id: string) {
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) return null;
  const bill = await loadTransferBill(id);
  return bill?.customerId === customerId ? bill : null;
}

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid Final Cost.' }, { status: 400 });
  try {
    const bill = await ownedBill(req, id);
    if (!bill) return NextResponse.json({ error: true, errorMessage: 'Unauthorized or bill not found.' }, { status: 403, headers });
    const submissions = await Database.select().from(ManualTransferSubmissions)
      .where(and(eq(ManualTransferSubmissions.finalBillId, id), eq(ManualTransferSubmissions.customerId, bill.customerId)))
      .orderBy(desc(ManualTransferSubmissions.createdAt)).limit(5);
    // No staff-only notes or internal metadata in customer responses.
    const attempts = submissions.map(row => ({ id: row.id, method: row.method, referenceNumber: row.referenceNumber,
      amount: row.amount, status: row.status, createdAt: row.createdAt,
      reviewMessage: row.status === 'REJECTED' ? (row.staffNote || 'Transfer not verified. Contact AutoCare before retrying.') : null }));
    return NextResponse.json({ error: false, data: { billStatus: bill.status, amount: bill.grandTotal,
      destinations: bill.status === 'OFFICIAL' ? getTransferDestinations() : [], submissions: attempts } }, { headers });
  } catch (e) {
    console.error('[manual-transfer GET]', e);
    return NextResponse.json({ error: true, errorMessage: 'Unable to load transfer details.' }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid Final Cost.' }, { status: 400 });
  const bill = await ownedBill(req, id);
  if (!bill) return NextResponse.json({ error: true, errorMessage: 'Unauthorized or bill not found.' }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await req.json(); if (!body || Array.isArray(body) || typeof body !== 'object') throw Error(); }
  catch { return NextResponse.json({ error: true, errorMessage: 'Invalid request.' }, { status: 400, headers }); }
  const method = String(body.method || '').toUpperCase() as TransferMethod;
  const referenceNumber = typeof body.referenceNumber === 'string' ? body.referenceNumber.trim().toUpperCase() : '';
  const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : '';
  const destination = getTransferDestinations().find(d => d.method === method);
  if (!destination) return NextResponse.json({ error: true, errorMessage: 'Payment destination is not enabled.' }, { status: 422, headers });
  if (!/^[A-Z0-9][A-Z0-9\- ]{5,79}$/.test(referenceNumber)) return NextResponse.json({ error: true,
    errorMessage: 'Enter the actual transaction reference (6–80 letters/numbers).' }, { status: 422, headers });
  if (senderName.length > 120 || (senderName && senderName.length < 2)) return NextResponse.json({ error: true,
    errorMessage: 'Invalid sender name.' }, { status: 422, headers });
  if (amountToCents(bill.grandTotal) < 100) return NextResponse.json({ error: true,
    errorMessage: 'This Final Cost cannot be paid with manual transfer.' }, { status: 422, headers });
  if (bill.status !== 'OFFICIAL') return NextResponse.json({ error: true,
    errorMessage: 'Only official unpaid bills accept transfer submissions.' }, { status: 409, headers });
  try {
    const result = await Database.transaction(async tx => {
      // Serializes customer requests for this bill. Staff approval uses the same bill row during settlement.
      await tx.execute(sql`SELECT id FROM final_bills WHERE id = ${id} FOR UPDATE`);
      const [freshBill] = await tx.select({ status: FinalBill.status, grandTotal: FinalBill.grandTotal })
        .from(FinalBill).where(eq(FinalBill.id, id)).limit(1);
      if (!freshBill || freshBill.status !== 'OFFICIAL' || amountToCents(freshBill.grandTotal) !== amountToCents(bill.grandTotal))
        return { conflict: 'Bill changed. Refresh payment details.' };
      const active = await tx.select({ id: ManualTransferSubmissions.id }).from(ManualTransferSubmissions)
        .where(and(eq(ManualTransferSubmissions.finalBillId, id), inArray(ManualTransferSubmissions.status, ['PENDING_REVIEW','VERIFYING'])))
        .limit(1);
      if (active.length) return { conflict: 'A transfer is already awaiting review.' };
      const attempts = await tx.select({ id: ManualTransferSubmissions.id }).from(ManualTransferSubmissions)
        .where(eq(ManualTransferSubmissions.finalBillId, id)).limit(5);
      if (attempts.length >= 5) return { conflict: 'Submission limit reached. Please contact the cashier.' };
      const [row] = await tx.insert(ManualTransferSubmissions).values({ finalBillId: id, customerId: bill.customerId,
        method, destinationAccount: destination.account, referenceNumber, senderName: senderName || null,
        amount: freshBill.grandTotal, status: 'PENDING_REVIEW' }).returning();
      return { row };
    });
    if ('conflict' in result) return NextResponse.json({ error: true, errorMessage: result.conflict }, { status: 409, headers });
    if (!result.row) throw new Error('No transfer submission returned.');
    await recordPaymentTransaction({ entityType: 'FINAL_BILL', entityId: id, appointmentId: bill.appointmentId,
      eventType: 'MANUAL_TRANSFER_SUBMITTED', fromStatus: 'OFFICIAL', toStatus: 'OFFICIAL',
      paymentMethod: method, referenceNumber, amount: bill.grandTotal, details: { submissionId: result.row.id } });
    return NextResponse.json({ error: false, message: 'Submitted for cashier verification. Not yet paid.',
      data: { id: result.row.id, status: 'PENDING_REVIEW' } }, { status: 201, headers });
  } catch (e: any) {
    if (e?.code === '23505') return NextResponse.json({ error: true,
      errorMessage: 'This transaction reference was already submitted or another review is pending.' }, { status: 409, headers });
    console.error('[manual-transfer POST]', e);
    return NextResponse.json({ error: true, errorMessage: 'Submission failed. Please retry safely.' }, { status: 500, headers });
  }
}
