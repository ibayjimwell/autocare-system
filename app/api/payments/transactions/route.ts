import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { PaymentTransactions } from '@/database/models/payments/payment-transactions.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Unauthorized.' }, { status: 401 });
  if (session.user.access?.payments !== true) return NextResponse.json({ error: true, errorMessage: 'Payments access is required.' }, { status: 403 });

  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  try {
    let query: any = Database.select({
      id: PaymentTransactions.id, entityType: PaymentTransactions.entityType, entityId: PaymentTransactions.entityId,
      appointmentId: PaymentTransactions.appointmentId, eventType: PaymentTransactions.eventType,
      fromStatus: PaymentTransactions.fromStatus, toStatus: PaymentTransactions.toStatus, amount: PaymentTransactions.amount,
      paymentMethod: PaymentTransactions.paymentMethod, referenceNumber: PaymentTransactions.referenceNumber,
      details: PaymentTransactions.details, createdAt: PaymentTransactions.createdAt,
      trackingNumber: Appointments.trackingNumber, customerName: Customers.fullname,
      staffName: Staffs.fullname, staffUsername: Staffs.username,
    }).from(PaymentTransactions)
      .leftJoin(Appointments, eq(PaymentTransactions.appointmentId, Appointments.id))
      .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
      .leftJoin(Staffs, eq(PaymentTransactions.actorStaffId, Staffs.id));
    if (q) {
      const pattern = `%${q}%`;
      query = query.where(or(
        ilike(PaymentTransactions.eventType, pattern), ilike(PaymentTransactions.entityType, pattern),
        ilike(Appointments.trackingNumber, pattern), ilike(Customers.fullname, pattern),
        ilike(PaymentTransactions.referenceNumber, pattern), ilike(Staffs.fullname, pattern),
      ));
    }
    const data = await query.orderBy(desc(PaymentTransactions.createdAt)).limit(500);
    return NextResponse.json({ error: false, data });
  } catch (error) {
    console.error('[GET /api/payments/transactions]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to load payment transaction history.' }, { status: 500 });
  }
}
