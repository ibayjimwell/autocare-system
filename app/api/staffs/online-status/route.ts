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

  const staffId = session.user.id;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { isOnline, currentModule } = body; // both optional

  // Build update object
  const updateData: any = { updatedAt: new Date() };
  if (typeof isOnline === 'boolean') updateData.isOnline = isOnline;
  if (currentModule !== undefined) updateData.currentModule = currentModule;

  if (Object.keys(updateData).length === 1) { // only updatedAt
    return NextResponse.json({ error: true, errorMessage: 'No fields to update' }, { status: 400 });
  }

  try {
    // --- 1. Fetch current isOnline to detect actual change ---
    const [currentStaff] = await Database
      .select({ isOnline: Staffs.isOnline })
      .from(Staffs)
      .where(eq(Staffs.id, staffId))
      .limit(1);

    const previousOnline = currentStaff?.isOnline ?? false;

    // --- 2. Perform the update ---
    await Database.update(Staffs)
      .set(updateData)
      .where(eq(Staffs.id, staffId));

    // --- 3. Fire trigger only if isOnline actually changed ---
    if (typeof isOnline === 'boolean') {
      if (isOnline && !previousOnline) {
        // Went from offline → online
        staffsTriggers.onOnline({
          fullname: session.user.fullname,
        }).catch(console.error);
      } else if (!isOnline && previousOnline) {
        // Went from online → offline
        staffsTriggers.onOffline({
          fullname: session.user.fullname,
        }).catch(console.error);
      }
      // If no change, no trigger
    }

    return NextResponse.json({ error: false, message: 'Status updated' }, { status: 200 });
  } catch (e) {
    console.error('[PATCH /api/staffs/online-status]', e);
    return NextResponse.json({ error: true, errorMessage: 'Database error' }, { status: 500 });
  }
}