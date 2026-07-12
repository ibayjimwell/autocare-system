import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { PushSubscriptions } from '@/database/models/notifications/push-subscription.model';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: true, errorMessage: 'Missing subscription details' }, { status: 422 });
  }

  try {
    // Remove old subscription for this staff+endpoint to avoid duplicates
    await Database.delete(PushSubscriptions)
      .where(and(
        eq(PushSubscriptions.staffId, session.user.id),
        eq(PushSubscriptions.endpoint, endpoint),
      ));

    await Database.insert(PushSubscriptions).values({
      staffId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ error: false, message: 'Subscription saved' }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/push-subscriptions]', e);
    return NextResponse.json({ error: true, errorMessage: 'Failed to save subscription' }, { status: 500 });
  }
}