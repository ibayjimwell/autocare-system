import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { Database } from '@/lib/drizzle';
import { PushSubscriptions } from '@/database/models/notifications/push-subscription.model';

webpush.setVapidDetails(
  'mailto:admin@autocare.com', // change to your email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Supabase webhook sends the record in body.record for INSERT/UPDATE
    // We'll just use a generic payload for the notification
    const payload = JSON.stringify({
      title: 'Low Stock Alert',
      body: `Item "${body.record?.name || 'Unknown'}" is running low.`,
      url: '/inventory',
    });

    // Fetch all subscriptions (in production, filter by staff who need alerts)
    const subs = await Database.select().from(PushSubscriptions);

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // Clean expired subscriptions
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' && result.reason.statusCode === 410) {
        // Subscription expired – remove from DB
        await Database.delete(PushSubscriptions).where(eq(PushSubscriptions.id, subs[i].id));
      }
    }

    return NextResponse.json({ error: false, message: 'Push sent' }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/webhooks/push]', e);
    return NextResponse.json({ error: true, errorMessage: 'Push failed' }, { status: 500 });
  }
}