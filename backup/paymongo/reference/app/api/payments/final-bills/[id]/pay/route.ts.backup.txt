// app/api/payments/final-bills/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq, and, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { isValidUUID } from '@/utils/shared';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';

// Cashier payment must never be callable anonymously or by an unrelated customer.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.access?.payments !== true) {
    return NextResponse.json({ error: true, errorMessage: 'Not authorized to process a counter payment.' }, { status: 403 });
  }
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID.' }, { status: 400 });
  try {
    const [hosted] = await Database.select({ id: HostedCheckoutAttempts.id }).from(HostedCheckoutAttempts)
      .where(and(eq(HostedCheckoutAttempts.finalBillId, id),
        inArray(HostedCheckoutAttempts.status, ['CREATING','CREATE_UNKNOWN','ACTIVE','PROCESSING']))).limit(1);
    const [qr] = await Database.select({ id: QrPhPaymentAttempts.id }).from(QrPhPaymentAttempts)
      .where(and(eq(QrPhPaymentAttempts.finalBillId, id),
        inArray(QrPhPaymentAttempts.status, ['INITIATED','PENDING','PROCESSING','SUCCEEDED']))).limit(1);
    if (hosted || qr) {
      return NextResponse.json({ error: true,
        errorMessage: 'A PayMongo checkout is already open. Confirm or cancel it before collecting cash to avoid duplicate payments.' }, { status: 409 });
    }
    const result = await generatePaymentReceipt(id);
    return NextResponse.json({ error: false, message: 'Payment processed and receipt generated.', data: result }, { status: 201 });
  } catch (err: any) {
    console.error('[PAY]', err);
    if (err?.message === 'Final Cost not found') return NextResponse.json({ error: true, errorMessage: 'Final Cost not found.' }, { status: 404 });
    if (err?.message === 'Bill already paid') return NextResponse.json({ error: true, errorMessage: 'Bill already paid.' }, { status: 409 });
    return NextResponse.json({ error: true, errorMessage: 'Failed to process payment.' }, { status: 500 });
  }
}
