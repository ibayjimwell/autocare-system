import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/utils/shared';
import { verifyJWT } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { resetToken, newPassword } = body;
  if (!resetToken || !newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json(
      { error: true, errorMessage: 'Reset token and a new password (min 6 chars) are required.' },
      { status: 422 }
    );
  }

  // Verify reset token
  let decoded;
  try {
    decoded = await verifyJWT(resetToken);
  } catch {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid or expired reset token.' },
      { status: 401 }
    );
  }

  if (decoded.purpose !== 'password-reset' || !decoded.id) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid reset token.' },
      { status: 401 }
    );
  }

  // Hash new password
  const hashed = await hashPassword(newPassword);

  // Update customer
  await Database.update(Customers)
    .set({ password: hashed, tempPassword: false, updatedAt: new Date() })
    .where(eq(Customers.id, decoded.id));

  return NextResponse.json({
    error: false,
    message: 'Password has been reset successfully.',
  }, { status: 200 });
}