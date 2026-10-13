// app/api/customers/push-subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { CustomerPushSubscriptions } from '@/database/models/notifications/customer-push-subscription.model';
import { and, eq, ne } from 'drizzle-orm';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { Expo } from 'expo-server-sdk';

export async function POST(req: NextRequest) {
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }
  const { expoPushToken } = body;

  if (typeof expoPushToken !== 'string' || !Expo.isExpoPushToken(expoPushToken)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid push token' }, { status: 400 });
  }

  try {
    // A device token may belong to only its currently authenticated customer.
    await Database.delete(CustomerPushSubscriptions).where(
      and(eq(CustomerPushSubscriptions.expoPushToken, expoPushToken), ne(CustomerPushSubscriptions.customerId, customerId))
    );
    // Upsert: if the token already exists for this customer, update the timestamp, else insert
    const existing = await Database
      .select()
      .from(CustomerPushSubscriptions)
      .where(
        and(
          eq(CustomerPushSubscriptions.customerId, customerId),
          eq(CustomerPushSubscriptions.expoPushToken, expoPushToken)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Just update timestamp
      await Database
        .update(CustomerPushSubscriptions)
        .set({ createdAt: new Date() })
        .where(eq(CustomerPushSubscriptions.id, existing[0].id));
    } else {
      await Database.insert(CustomerPushSubscriptions).values({
        customerId,
        expoPushToken,
      });
    }

    return NextResponse.json({ error: false, message: 'Push subscription saved.' }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/customers/push-subscriptions] Error:', e);
    return NextResponse.json(
      { error: true, errorMessage: 'Database error' },
      { status: 500 }
    );
  }
}
/** Remove a device token when this customer logs out. */
export async function DELETE(req: NextRequest) {
  const customerId = await getArrivalCustomerId(req);
  if (!customerId) return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 });
  }
  if (typeof body?.expoPushToken !== 'string') {
    return NextResponse.json({ error: true, errorMessage: 'Push token required.' }, { status: 400 });
  }
  try {
    await Database.delete(CustomerPushSubscriptions).where(and(
      eq(CustomerPushSubscriptions.customerId, customerId),
      eq(CustomerPushSubscriptions.expoPushToken, body.expoPushToken),
    ));
    return NextResponse.json({ error: false, message: 'Subscription removed.' });
  } catch (error) {
    console.error('[PushSubscription] Delete failed:', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to unsubscribe device.' }, { status: 500 });
  }
}
