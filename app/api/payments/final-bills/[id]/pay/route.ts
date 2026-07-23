// app/api/payments/final-bills/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isValidUUID } from '@/utils/shared';
import { generatePaymentReceipt } from '@/utils/payments/generate-payment-receipt';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID' }, { status: 400 });
  }

  try {
    const result = await generatePaymentReceipt(id);
    return NextResponse.json({
      error: false,
      message: 'Payment processed and receipt generated.',
      data: result,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[PAY]', err);
    // Handle specific error messages from the shared function
    if (err.message === 'Final bill not found') {
      return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
    }
    if (err.message === 'Bill already paid') {
      return NextResponse.json({ error: true, errorMessage: 'Bill already paid' }, { status: 400 });
    }
    return NextResponse.json({ error: true, errorMessage: 'Failed to process payment.' }, { status: 500 });
  }
}