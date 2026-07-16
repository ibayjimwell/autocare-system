// app/api/webhooks/paymongo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paymongo';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFindings } from '@/database/models/payments/final-bill-findings.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { FinalBillDiscounts } from '@/database/models/payments/final-bill-discounts.model';
import { FinalBillWorkTasks } from '@/database/models/payments/final-bill-work-tasks.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { Receipts } from '@/database/models/payments/receipts.model';
import { eq } from 'drizzle-orm';
import { paymentsTriggers } from '@/triggers/payments';

// Helper: generate reference number (same as in the manual pay route)
function generateReferenceNumber(): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RES-${yy}${mm}${dd}-${random}`;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('paymongo-signature');
  const rawBody = await req.text();

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: true, message: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: true, message: 'Invalid JSON' }, { status: 400 });
  }

  // Only process payment success events
  if (event.data?.attributes?.type !== 'payment.paid') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const remarks = event.data.attributes.data?.attributes?.remarks || '';
  const match = remarks.match(/^Final bill (.+)$/);
  if (!match) {
    console.error('[Webhook] Could not parse bill ID from remarks:', remarks);
    return NextResponse.json({ error: true, message: 'Invalid remarks' }, { status: 400 });
  }

  const billId = match[1];

  try {
    // Fetch the final bill with appointment to get tracking number and customer
    const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId)).limit(1);

    if (!bill) {
      return NextResponse.json({ error: true, message: 'Final bill not found' }, { status: 404 });
    }

    if (bill.status === 'PAID') {
      // Already paid – maybe idempotent webhook, return success
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Fetch appointment for tracking number and customer name
    const [appointment] = await Database.select().from(Appointments).where(eq(Appointments.id, bill.appointmentId)).limit(1);
    if (!appointment) {
      return NextResponse.json({ error: true, message: 'Appointment not found' }, { status: 404 });
    }

    const [customer] = await Database.select().from(Customers).where(eq(Customers.id, appointment.customerId)).limit(1);

    // Build receipt data (simplified – you can replicate the full data like in the manual pay route)
    const receiptData = {
      customer: customer ? { fullname: customer.fullname, email: customer.email, phone: customer.phone } : null,
      // ... (you can include the full details as in the manual pay route if needed)
      payment: {
        totalAmount: bill.grandTotal,
        paidAt: new Date().toISOString(),
      },
    };

    const referenceNumber = generateReferenceNumber();

    // Transaction: insert receipt and mark bill as PAID
    await Database.transaction(async (tx) => {
      await tx.insert(Receipts).values({
        referenceNumber,
        finalBillId: bill.id,
        estimateId: bill.estimateId,
        appointmentId: bill.appointmentId,
        data: receiptData,
      });
      await tx.update(FinalBill).set({ status: 'PAID', updatedAt: new Date() }).where(eq(FinalBill.id, billId));
    });

    // Send push notification
    paymentsTriggers.onPaymentCompleted({
      trackingNumber: appointment.trackingNumber,
      customerName: customer?.fullname,
    }).catch(console.error);

    console.log(`[Webhook] Bill ${billId} marked as paid, receipt ${referenceNumber} generated.`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[Webhook] Payment processing error:', err);
    return NextResponse.json({ error: true, message: 'Payment processing failed' }, { status: 500 });
  }
}