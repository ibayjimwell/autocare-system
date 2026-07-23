// app/api/payments/final-bills/[id]/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { getPaymentLinkStatus } from '@/lib/paymongo';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';
import { sendPushToCustomer } from '@/lib/push/customer-push';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;

  if (!isValidUUID(billId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID' }, { status: 400 });
  }

  const body = await req.json();
  const { paymongoLinkId } = body;

  if (!paymongoLinkId) {
    return NextResponse.json({ error: true, errorMessage: 'Missing paymongoLinkId' }, { status: 400 });
  }

  // Check current bill status
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId)).limit(1);
  if (!bill) {
    return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
  }

  if (bill.status === 'PAID') {
    // Could fetch the existing receipt reference if needed, but just return success
    return NextResponse.json({
      error: false,
      message: 'Bill already paid',
      paid: true,
      referenceNumber: null,
    }, { status: 200 });
  }

  // Verify with PayMongo
  let linkStatus;
  try {
    linkStatus = await getPaymentLinkStatus(paymongoLinkId);
  } catch (err) {
    console.error('[VerifyPayment] PayMongo error:', err);
    return NextResponse.json({
      error: true,
      errorMessage: 'Unable to verify payment at this time.',
    }, { status: 502 });
  }

  if (!linkStatus.isPaid) {
    return NextResponse.json({
      error: false,
      paid: false,
      message: 'Payment not yet completed.',
    }, { status: 200 });
  }

  // Payment confirmed – generate full receipt and mark as paid
  try {
    const { referenceNumber, receiptData } = await generatePaymentReceipt(billId);

    // Send push notification to the customer
    const [appointment] = await Database
      .select()
      .from(Appointments)
      .where(eq(Appointments.id, bill.appointmentId))
      .limit(1);
    if (appointment) {
      const [customer] = await Database
        .select()
        .from(Customers)
        .where(eq(Customers.id, appointment.customerId))
        .limit(1);
      if (customer) {
        sendPushToCustomer(customer.id, '💰 Payment Successful', 'Your payment has been processed. A receipt has been generated.', {
          url: `/invoice/${billId}`,
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      error: false,
      paid: true,
      message: 'Payment verified and processed.',
      referenceNumber,
      receiptData,
    }, { status: 200 });
  } catch (err: any) {
    console.error('[VerifyPayment] Receipt generation failed:', err);
    return NextResponse.json({
      error: true,
      paid: true,           // Payment did succeed, but receipt creation failed
      errorMessage: 'Payment succeeded but receipt generation failed.',
    }, { status: 500 });
  }
}