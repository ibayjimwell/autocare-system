import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { staffsTriggers } from '@/triggers/staffs';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { isOnline, currentModule } = body;
  if (isOnline !== undefined && typeof isOnline !== 'boolean') {
    return NextResponse.json({ error: true, errorMessage: 'isOnline must be a boolean.' }, { status: 422 });
  }

  const staffId = session.user.id;
  const now = new Date();
  const updateData: any = { updatedAt: now };
  if (typeof isOnline === 'boolean') {
    updateData.isOnline = isOnline;
    updateData.lastActiveAt = isOnline ? now : null;
    if (!isOnline && currentModule === undefined) updateData.currentModule = null;
  }
  if (currentModule !== undefined) updateData.currentModule = currentModule || null;
  if (Object.keys(updateData).length === 1) {
    return NextResponse.json({ error: true, errorMessage: 'No fields to update' }, { status: 400 });
  }

  try {
    const [currentStaff] = await Database.select({ isOnline: Staffs.isOnline })
      .from(Staffs).where(eq(Staffs.id, staffId)).limit(1);
    const previousOnline = currentStaff?.isOnline ?? false;
    await Database.update(Staffs).set(updateData).where(eq(Staffs.id, staffId));
    if (typeof isOnline === 'boolean') {
      if (isOnline && !previousOnline) staffsTriggers.onOnline({ fullname: session.user.fullname }).catch(console.error);
      else if (!isOnline && previousOnline) staffsTriggers.onOffline({ fullname: session.user.fullname }).catch(console.error);
    }
    return NextResponse.json({ error: false, message: 'Status updated', data: { isOnline, lastActiveAt: updateData.lastActiveAt ?? null } });
  } catch (error) {
    console.error('[PATCH /api/staffs/online-status]', error);
    return NextResponse.json({ error: true, errorMessage: 'Database error' }, { status: 500 });
  }
}
