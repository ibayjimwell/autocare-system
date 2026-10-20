import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { StaffNotifications } from '@/database/models/notifications/staff-notification.model';

const noCache = { 'Cache-Control': 'private, no-store, max-age=0' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function currentStaffId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

// Always derive staff_id from the signed-in NextAuth session. Never accept a
// staff ID from query parameters or the request body.
export async function GET(req: NextRequest) {
  const staffId = await currentStaffId();
  if (!staffId) return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401, headers: noCache });
  const requestedLimit = Number(new URL(req.url).searchParams.get('limit') || 100);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 100;

  try {
    const [data, countRows] = await Promise.all([
      Database.select({
        id: StaffNotifications.id,
        title: StaffNotifications.title,
        body: StaffNotifications.body,
        url: StaffNotifications.url,
        module: StaffNotifications.module,
        event: StaffNotifications.event,
        timestamp: StaffNotifications.createdAt,
        readAt: StaffNotifications.readAt,
      }).from(StaffNotifications)
        .where(and(eq(StaffNotifications.staffId, staffId), isNull(StaffNotifications.dismissedAt)))
        .orderBy(desc(StaffNotifications.createdAt), desc(StaffNotifications.id))
        .limit(limit),
      Database.select({ count: sql<number>`count(*)` }).from(StaffNotifications)
        .where(and(eq(StaffNotifications.staffId, staffId), isNull(StaffNotifications.dismissedAt), isNull(StaffNotifications.readAt))),
    ]);

    return NextResponse.json({
      error: false,
      data: data.map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        url: item.url,
        module: item.module,
        event: item.event,
        timestamp: item.timestamp.toISOString(),
        read: item.readAt !== null,
      })),
      unreadCount: Number(countRows[0]?.count || 0),
    }, { headers: noCache });
  } catch (error) {
    console.error('[GET /api/staffs/notifications]', error);
    return NextResponse.json({ error: true, errorMessage: 'Could not load notifications.' }, { status: 500, headers: noCache });
  }
}

export async function PATCH(req: NextRequest) {
  const staffId = await currentStaffId();
  if (!staffId) return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401, headers: noCache });
  let body: { action?: string; id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid request JSON.' }, { status: 400, headers: noCache });
  }

  try {
    switch (body.action) {
      case 'read': {
        if (!body.id || !uuidPattern.test(body.id)) {
          return NextResponse.json({ error: true, errorMessage: 'Invalid notification ID.' }, { status: 422, headers: noCache });
        }
        await Database.update(StaffNotifications).set({ readAt: new Date() })
          .where(and(eq(StaffNotifications.staffId, staffId), eq(StaffNotifications.id, body.id), isNull(StaffNotifications.readAt), isNull(StaffNotifications.dismissedAt)));
        break;
      }
      case 'read-all': {
        await Database.update(StaffNotifications).set({ readAt: new Date() })
          .where(and(eq(StaffNotifications.staffId, staffId), isNull(StaffNotifications.readAt), isNull(StaffNotifications.dismissedAt)));
        break;
      }
      case 'clear-all': {
        // Soft-delete only this staff account's notifications. Existing
        // history for other users is never affected.
        await Database.update(StaffNotifications).set({ dismissedAt: new Date() })
          .where(and(eq(StaffNotifications.staffId, staffId), isNull(StaffNotifications.dismissedAt)));
        break;
      }
      default:
        return NextResponse.json({ error: true, errorMessage: 'Unsupported action.' }, { status: 422, headers: noCache });
    }
    return NextResponse.json({ error: false, message: 'Notifications updated.' }, { headers: noCache });
  } catch (error) {
    console.error('[PATCH /api/staffs/notifications]', error);
    return NextResponse.json({ error: true, errorMessage: 'Could not update notifications.' }, { status: 500, headers: noCache });
  }
}
