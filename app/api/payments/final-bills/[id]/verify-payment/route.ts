// app/api/payments/final-bills/[id]/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Receipts } from '@/database/models/payments/receipts.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { getPaymentLinkStatus } from '@/lib/paymongo';
import { paymentsTriggers } from '@/triggers/payments';
import { sendPushToCustomer } from '@/lib/push/customer-push';


function generateReferenceNumber(): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RES-${yy}${mm}${dd}-${random}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;

  if (!isValidUUID(billId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID' }, { status: 400 });
  }

  const body = await req.json();
  const { paymongoLinkId } = body;   // the link id returned when creating the payment

  if (!paymongoLinkId) {
    return NextResponse.json({ error: true, errorMessage: 'Missing paymongoLinkId' }, { status: 400 });
  }

  // Fetch final bill
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId)).limit(1);
  if (!bill) {
    return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
  }

  if (bill.status === 'PAID') {
    return NextResponse.json({
      error: false,
      message: 'Bill already paid',
      paid: true,
      referenceNumber: null,   // you could fetch the existing receipt
    }, { status: 200 });
  }

  // Check PayMongo payment status
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

  // Payment is successful – process the bill (same as webhook)
  const [appointment] = await Database.select()
    .from(Appointments)
    .where(eq(Appointments.id, bill.appointmentId))
    .limit(1);
  if (!appointment) {
    return NextResponse.json({ error: true, errorMessage: 'Appointment not found' }, { status: 404 });
  }

  const [customer] = await Database.select()
    .from(Customers)
    .where(eq(Customers.id, appointment.customerId))
    .limit(1);

  const receiptData = {
    customer: customer ? { fullname: customer.fullname, email: customer.email, phone: customer.phone } : null,
    payment: {
      totalAmount: bill.grandTotal,
      paidAt: new Date().toISOString(),
    },
  };

  const referenceNumber = generateReferenceNumber();

  await Database.transaction(async (tx) => {
    await tx.insert(Receipts).values({
      referenceNumber,
      finalBillId: bill.id,
      estimateId: bill.estimateId,
      appointmentId: bill.appointmentId,
      data: receiptData,
    });
    await tx.update(FinalBill)
      .set({ status: 'PAID', updatedAt: new Date() })
      .where(eq(FinalBill.id, billId));
  });

  // Send push notification
  paymentsTriggers.onPaymentCompleted({
    trackingNumber: appointment.trackingNumber,
    customerName: customer?.fullname,
  }).catch(console.error);

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
  }, { status: 200 });
}