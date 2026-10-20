import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNull, lte } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { CustomerNotificationRecords } from '@/database/models/notifications/customer-notification-record.model';
import { getArrivalCustomerId } from '@/lib/queue/arrival-auth';
import { isValidUUID } from '@/utils/shared';

// Every endpoint derives the customer from their verified Bearer token.
// Client-supplied customer IDs are deliberately ignored.
async function getCustomer(req: NextRequest) {
  return getArrivalCustomerId(req);
}

function cutoffDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

export async function GET(req: NextRequest) {
  const customerId = await getCustomer(req);
  if (!customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 100)
    : 100;

  try {
    const rows = await Database.select()
      .from(CustomerNotificationRecords)
      .where(and(
        eq(CustomerNotificationRecords.customerId, customerId),
        isNull(CustomerNotificationRecords.deletedAt),
      ))
      .orderBy(desc(CustomerNotificationRecords.createdAt), desc(CustomerNotificationRecords.id))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      error: false,
      data: rows,
      pagination: { page, limit, hasMore: rows.length === limit },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[CustomerNotifications] GET failed:', error);
    return NextResponse.json(
      { error: true, errorMessage: 'Unable to load notifications.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const customerId = await getCustomer(req);
  if (!customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  }
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 });
  }
  const action = body?.action;
  if (action !== 'read_one' && action !== 'read_all') {
    return NextResponse.json({ error: true, errorMessage: 'Unsupported action.' }, { status: 422 });
  }
  if (action === 'read_one' && !isValidUUID(body?.id || '')) {
    return NextResponse.json({ error: true, errorMessage: 'Valid notification ID required.' }, { status: 422 });
  }
  const before = cutoffDate(body?.before);
  if (action === 'read_all' && !before) {
    return NextResponse.json({ error: true, errorMessage: 'Valid cutoff timestamp required.' }, { status: 422 });
  }

  try {
    await Database.update(CustomerNotificationRecords)
      .set({ readAt: new Date() })
      .where(and(
        eq(CustomerNotificationRecords.customerId, customerId),
        isNull(CustomerNotificationRecords.deletedAt),
        ...(action === 'read_one'
          ? [eq(CustomerNotificationRecords.id, body.id)]
          : [lte(CustomerNotificationRecords.createdAt, before!)]),
      ));
    return NextResponse.json({ error: false, message: 'Notifications marked as read.' });
  } catch (error) {
    console.error('[CustomerNotifications] PATCH failed:', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to update notifications.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const customerId = await getCustomer(req);
  if (!customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Customer login required.' }, { status: 401 });
  }
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 });
  }
  const before = cutoffDate(body?.before);
  if (!before) {
    return NextResponse.json({ error: true, errorMessage: 'Valid cutoff timestamp required.' }, { status: 422 });
  }
  try {
    await Database.update(CustomerNotificationRecords)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(CustomerNotificationRecords.customerId, customerId),
        isNull(CustomerNotificationRecords.deletedAt),
        lte(CustomerNotificationRecords.createdAt, before),
      ));
    return NextResponse.json({ error: false, message: 'Notification history cleared.' });
  } catch (error) {
    console.error('[CustomerNotifications] DELETE failed:', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to clear notifications.' }, { status: 500 });
  }
}
