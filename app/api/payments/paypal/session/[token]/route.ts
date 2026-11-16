import { NextResponse } from 'next/server';
import {
  paypalCheckoutDetails,
  paypalClientId,
  paypalBrowserToken,
  reconcilePaypalAttempt,
} from '@/lib/payments/paypal-sandbox';
import { paypalStartError } from '@/lib/payments/paypal-start';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };
const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

export async function GET(_: Request, { params }: Context) {
  try {
    const { token } = await params;
    const { attempt, bill, expired } = await paypalCheckoutDetails(token);
    const state = await reconcilePaypalAttempt(attempt.id);

    if (state.paid) {
      return NextResponse.json({
        error: false,
        data: {
          status: state.status,
          paid: true,
          clientId: paypalClientId(),
          amount: (attempt.amountCentavos / 100).toFixed(2),
          currency: 'PHP',
          billId: attempt.finalBillId,
          browserToken: null,
        },
      }, { headers });
    }

    if (bill.status !== 'OFFICIAL') {
      return NextResponse.json({
        error: true,
        errorMessage: 'This Final Cost is no longer available for payment.',
      }, { status: 409, headers });
    }
    if (expired || ['EXPIRED', 'FAILED', 'CANCELLED'].includes(attempt.status)) {
      return NextResponse.json({
        error: true,
        errorMessage: 'Checkout expired or closed. Return to the Final Cost page to start again.',
      }, { status: 410, headers });
    }

    // Optional card fields require a browser token and account eligibility.
    // Failure to acquire it MUST NOT prevent PayPal Wallet checkout.
    const browserToken = await paypalBrowserToken().catch((cause) => {
      console.warn('[PayPal Sandbox] Card token unavailable; wallet remains available:', cause);
      return null;
    });

    return NextResponse.json({
      error: false,
      data: {
        status: state.status,
        paid: false,
        clientId: paypalClientId(),
        amount: (attempt.amountCentavos / 100).toFixed(2),
        currency: 'PHP',
        billId: attempt.finalBillId,
        browserToken,
      },
    }, { headers });
  } catch (error) {
    console.error('[PayPal Sandbox] Session:', error);
    const failure = paypalStartError(error);
    return NextResponse.json({
      error: true,
      code: failure.code,
      errorMessage: failure.errorMessage,
    }, { status: failure.status, headers });
  }
}
