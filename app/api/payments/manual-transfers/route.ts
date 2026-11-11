import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { ManualTransferSubmissions } from '@/database/models/payments/manual-transfer-submissions.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { desc, eq, inArray } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Sign in required.' }, { status: 401 });
  if (session.user.access?.payments !== true) return NextResponse.json({ error: true, errorMessage: 'Payments permission required.' }, { status: 403 });
  try {
    const data = await Database.select({
      id: ManualTransferSubmissions.id, finalBillId: ManualTransferSubmissions.finalBillId,
      method: ManualTransferSubmissions.method, destinationAccount: ManualTransferSubmissions.destinationAccount,
      referenceNumber: ManualTransferSubmissions.referenceNumber, senderName: ManualTransferSubmissions.senderName,
      amount: ManualTransferSubmissions.amount, status: ManualTransferSubmissions.status,
      createdAt: ManualTransferSubmissions.createdAt, verifiedAt: ManualTransferSubmissions.verifiedAt,
      billStatus: FinalBill.status, currentBillAmount: FinalBill.grandTotal,
      trackingNumber: Appointments.trackingNumber, customerName: Customers.fullname,
    }).from(ManualTransferSubmissions)
      .innerJoin(FinalBill, eq(ManualTransferSubmissions.finalBillId, FinalBill.id))
      .innerJoin(Appointments, eq(FinalBill.appointmentId, Appointments.id))
      .innerJoin(Customers, eq(Appointments.customerId, Customers.id))
      .where(inArray(ManualTransferSubmissions.status, ['PENDING_REVIEW', 'VERIFYING']))
      .orderBy(desc(ManualTransferSubmissions.createdAt)).limit(100);
    return NextResponse.json({ error: false, data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('[manual transfers staff queue]', e);
    return NextResponse.json({ error: true, errorMessage: 'Unable to load transfers. Has migration 0051 been applied?' }, { status: 500 });
  }
}
