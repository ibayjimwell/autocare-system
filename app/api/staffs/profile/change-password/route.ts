import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { eq } from 'drizzle-orm';
import { validatePassword, validatePasswordStrength, hashPassword } from '@/utils/shared';

/** Staff can change only their own password after verifying the current password. */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 }); }
  const { currentPassword, newPassword } = body || {};
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string')
    return NextResponse.json({ error: true, errorMessage: 'Enter your current and new passwords.' }, { status: 422 });
  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) return NextResponse.json({ error: true, errorMessage: strength.errors.join(' ') }, { status: 422 });
  try {
    const [staff] = await Database.select().from(Staffs).where(eq(Staffs.id, session.user.id)).limit(1);
    if (!staff) return NextResponse.json({ error: true, errorMessage: 'Staff account not found.' }, { status: 404 });
    if (!(await validatePassword(currentPassword, staff.password)))
      return NextResponse.json({ error: true, errorMessage: 'Current password is incorrect.' }, { status: 401 });
    if (await validatePassword(newPassword, staff.password))
      return NextResponse.json({ error: true, errorMessage: 'Choose a password different from your current one.' }, { status: 422 });
    await Database.update(Staffs).set({ password: await hashPassword(newPassword), tempPassword: false, updatedAt: new Date() })
      .where(eq(Staffs.id, staff.id));
    return NextResponse.json({ error: false, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('[Staff profile password]', error);
    return NextResponse.json({ error: true, errorMessage: 'Unable to change password.' }, { status: 500 });
  }
}
