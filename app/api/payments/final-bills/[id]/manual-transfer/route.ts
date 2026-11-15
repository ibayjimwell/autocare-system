import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { isValidUUID } from '@/utils/shared';
import { ManualTransferSubmissions } from '@/database/models/payments/manual-transfer-submissions.model';
import { getTransferDestinations, loadTransferBill } from '@/lib/payments/manual-transfer';

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

// Historical transfer submissions remain readable for audit purposes only.
// No new manual transfers can be submitted from AutoCare.
export async function POST() {
  return NextResponse.json({ error: true, errorMessage: 'Electronic-transfer verification is retired. Use Cash or PayPal.' },
    { status: 410, headers });
}
