import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { PushSubscriptions } from '@/database/models/notifications/push-subscription.model';
import { eq, and } from 'drizzle-orm';

// One browser PushSubscription endpoint must belong to exactly one staff
// account, even if different staff members use the same workstation.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }
  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys.auth || endpoint.length > 2048) {
    return NextResponse.json({ error: true, errorMessage: 'Missing subscription details' }, { status: 422 });
  }
  try {
    // Atomic reassignment: shared workstations can never have the same
    // browser endpoint registered for two staff accounts simultaneously.
    await Database.insert(PushSubscriptions).values({
      staffId: session.user.id,
      endpoint,
      p256dh: keys.p256dh!,
      auth: keys.auth!,
    }).onConflictDoUpdate({
      target: PushSubscriptions.endpoint,
      set: {
        staffId: session.user.id,
        p256dh: keys.p256dh!,
        auth: keys.auth!,
      },
    });
    return NextResponse.json({ error: false, message: 'Subscription saved' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/push-subscriptions]', error);
    return NextResponse.json({ error: true, errorMessage: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }
  let body: { endpoint?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.endpoint || typeof body.endpoint !== 'string') {
    return NextResponse.json({ error: true, errorMessage: 'Endpoint required' }, { status: 422 });
  }
  try {
    await Database.delete(PushSubscriptions).where(and(
      eq(PushSubscriptions.staffId, session.user.id),
      eq(PushSubscriptions.endpoint, body.endpoint),
    ));
    return NextResponse.json({ error: false, message: 'Subscription released' });
  } catch (error) {
    console.error('[DELETE /api/push-subscriptions]', error);
    return NextResponse.json({ error: true, errorMessage: 'Failed to release subscription' }, { status: 500 });
  }
}
