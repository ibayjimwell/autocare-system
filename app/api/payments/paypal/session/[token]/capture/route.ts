import { NextResponse } from 'next/server';
import { capturePaypalOrder } from '@/lib/payments/paypal-sandbox';
import { paypalStartError } from '@/lib/payments/paypal-start';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ token: string }> };
const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(req: Request, { params }: Context) {
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.orderId !== 'string') {
      return NextResponse.json({
        error: true,
        errorMessage: 'Missing PayPal order reference.',
      }, { status: 400, headers });
    }
    const result = await capturePaypalOrder((await params).token, body.orderId);
    return NextResponse.json({ error: false, data: result }, { headers });
  } catch (error) {
    console.error('[PayPal Sandbox] Capture order:', error);
    const failure = paypalStartError(error);
    return NextResponse.json({
      error: true,
      code: failure.code,
      errorMessage: failure.errorMessage,
    }, { status: failure.status, headers });
  }
}
