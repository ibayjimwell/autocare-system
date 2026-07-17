// app/api/customers/push-subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { CustomerPushSubscriptions } from '@/database/models/notifications/customer-push-subscription.model';
import { and, eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId, expoPushToken } = body;

  if (!customerId || !isValidUUID(customerId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid customer ID' }, { status: 400 });
  }
  if (!expoPushToken || typeof expoPushToken !== 'string') {
    return NextResponse.json({ error: true, errorMessage: 'Invalid push token' }, { status: 400 });
  }

  try {
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