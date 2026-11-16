import { NextResponse } from 'next/server';
import { ensurePaypalOrder } from '@/lib/payments/paypal-sandbox';
import { paypalStartError } from '@/lib/payments/paypal-start';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ token: string }> };
const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(_: Request, { params }: Context) {
  try {
    const order = await ensurePaypalOrder((await params).token);
    return NextResponse.json(
      { error: false, data: { id: order.id } },
      { headers },
    );
  } catch (error) {
    console.error('[PayPal Sandbox] Create order:', error);
    const failure = paypalStartError(error);
    return NextResponse.json({
      error: true,
      code: failure.code,
      errorMessage: failure.errorMessage,
    }, { status: failure.status, headers });
  }
}
