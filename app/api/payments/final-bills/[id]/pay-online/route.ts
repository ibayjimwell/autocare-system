// app/api/payments/final-bills/[id]/pay-online/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { createPaymongoPaymentLink } from '@/lib/paymongo';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID' }, { status: 400 });
  }

  // Fetch final bill
  const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, id)).limit(1);

  if (!bill) {
    return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
  }

  if (bill.status === 'PAID') {
    return NextResponse.json({ error: true, errorMessage: 'Bill already paid' }, { status: 400 });
  }

  try {
    const amountInCentavos = Math.round(parseFloat(bill.grandTotal) * 100);
    const description = `Payment for invoice ${bill.id.slice(0, 8)}`;

    const paymentLink = await createPaymongoPaymentLink({
      amount: amountInCentavos,
      description,
      remarks: `Final bill ${id}`,
    });

    return NextResponse.json({
      error: false,
      message: 'Payment link created.',
      data: {
        checkoutUrl: paymentLink.checkoutUrl,
        paymongoLinkId: paymentLink.id,
        referenceNumber: paymentLink.referenceNumber,
      },
    }, { status: 201 });
  } catch (e) {
    console.error('[pay-online] Exception caught:', e instanceof Error ? e.message : e);
    console.error('[pay-online] Full error object:', e);
    return NextResponse.json(
      {
        error: true,
        errorTitle: 'Payment creation failed',
        errorMessage: e instanceof Error ? e.message : 'Unable to create PayMongo link.',
      },
      { status: 500 }
    );
  }
}