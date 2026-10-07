import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { generateTempPassword } from '@/utils/staffs';
import { hashPassword, isValidUUID } from '@/utils/shared';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Unauthorized.' }, { status: 401 });
  if (session.user.access?.staffs !== true) return NextResponse.json({ error: true, errorMessage: 'Staffs access is required.' }, { status: 403 });
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid staff ID.' }, { status: 422 });
  try {
    const [staff] = await Database.select({ id: Staffs.id, fullname: Staffs.fullname, username: Staffs.username }).from(Staffs).where(eq(Staffs.id, id)).limit(1);
    if (!staff) return NextResponse.json({ error: true, errorMessage: 'Staff member not found.' }, { status: 404 });
    const temporaryPassword = generateTempPassword(staff.username);
    const password = await hashPassword(temporaryPassword);
    await Database.update(Staffs).set({ password, tempPassword: true, isOnline: false, currentModule: null, lastActiveAt: null, updatedAt: new Date() }).where(eq(Staffs.id, id));
    return NextResponse.json({ error: false, message: 'Password reset.', data: { id: staff.id, fullname: staff.fullname, tempPasswordPlain: temporaryPassword } });
  } catch (error) {
    console.error('[POST /api/staffs/[id]/reset-password]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to reset this password.' }, { status: 500 });
  }
}
