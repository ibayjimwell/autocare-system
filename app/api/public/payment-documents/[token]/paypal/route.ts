import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { resolveShare, shareUrl } from '@/lib/document-share/access';
import { billCentavos } from '@/lib/payments/paypal-sandbox';
import { beginPaypalCheckout, paypalStartError } from '@/lib/payments/paypal-start';

export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};
const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

type Context = { params: Promise<{ token: string }> };

export async function POST(_: Request, { params }: Context) {
  try {
    const { token } = await params;
    const link = await resolveShare(token);
    if (!link || link.documentType !== 'final-bill') {
      return respond({ error: true, errorMessage: 'Payment link expired or unavailable.' }, 404);
    }

    // Read only the authoritative bill fields. Rebuilding the entire PDF/share
    // document just to launch checkout can fail on unrelated joins or warranties.
    const [bill] = await Database.select({
      id: FinalBill.id,
      status: FinalBill.status,
      grandTotal: FinalBill.grandTotal,
    }).from(FinalBill).where(eq(FinalBill.id, link.documentId)).limit(1);

    if (!bill) {
      return respond({ error: true, errorMessage: 'Final Cost not found.' }, 404);
    }
    if (bill.status === 'PAID') {
      return respond({ error: true, errorMessage: 'This Final Cost is already paid. Refresh to view its receipt.' }, 409);
    }
    if (bill.status !== 'OFFICIAL') {
      return respond({ error: true, errorMessage: 'Final Cost is not available for payment.' }, 409);
    }

    const amount = billCentavos(bill.grandTotal);
    const checkout = await beginPaypalCheckout(bill.id, amount);

    const url = new URL(checkout.checkoutUrl);
    url.searchParams.set('returnTo', new URL(shareUrl(token)).pathname);

    return respond({
      error: false,
      data: {
        checkoutUrl: url.toString(),
        status: checkout.status,
        reused: checkout.reused,
        sandbox: true,
      },
    }, checkout.reused ? 200 : 201);
  } catch (error) {
    console.error('[Public PayPal checkout start]', error);
    const failure = paypalStartError(error);
    return respond({
      error: true,
      code: failure.code,
      errorMessage: failure.errorMessage,
    }, failure.status);
  }
}
