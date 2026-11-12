import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { isVerifiedHostedWebhook, paymongoIsLive, reconcileHostedAttempt } from '@/lib/payments/hosted-checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!isVerifiedHostedWebhook(body, req.headers.get('paymongo-signature') ?? '')) {
      return NextResponse.json({ error: true }, { status: 401 });
    }
    const event = JSON.parse(body);
    // Older/newer PayMongo webhook envelopes have been observed in docs.
    const type = event?.data?.attributes?.type ?? event?.data?.type;
    if (type !== 'checkout_session.payment.paid') return NextResponse.json({ received: true, ignored: true });
    const data = event?.data?.attributes?.data ?? event?.data?.data;
    const sessionId = data?.id;
    const eventIsLive = event?.data?.attributes?.livemode ?? event?.data?.livemode;
    if (typeof sessionId !== 'string' || typeof eventIsLive !== 'boolean' || eventIsLive !== paymongoIsLive()) {
      return NextResponse.json({ error: true, errorMessage: 'Invalid provider event.' }, { status: 403 });
    }
    const [attempt] = await Database.select().from(HostedCheckoutAttempts)
      .where(eq(HostedCheckoutAttempts.checkoutSessionId, sessionId)).limit(1);
    if (!attempt || attempt.livemode !== eventIsLive) {
      return NextResponse.json({ error: true, errorMessage: 'Checkout reference not found.' }, { status: 404 });
    }
    // The signed webhook only signals work. Retrieve the session from PayMongo
    // with the server secret before marking any real bill paid.
    const reconciled = await reconcileHostedAttempt(attempt.id);
    if (reconciled.status === 'PENDING') return NextResponse.json({ error: true, errorMessage: 'Checkout is not yet paid.' }, { status: 503 });
    return NextResponse.json({ received: true, processed: true });
  } catch (cause) {
    console.error('[Hosted Checkout Webhook] Verification/settlement failed:', cause);
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
