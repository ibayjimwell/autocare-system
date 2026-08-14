import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { PasswordResetOtps } from '@/database/models/customers/password-reset-otps.model';
import { eq, and, sql } from 'drizzle-orm';
import { signJWT } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, otp } = body;
  if (!phone || !otp) {
    return NextResponse.json(
      { error: true, errorMessage: 'Phone and OTP are required.' },
      { status: 422 }
    );
  }

  // Find customer
  const [customer] = await Database.select()
    .from(Customers)
    .where(eq(Customers.phone, phone.trim()))
    .limit(1);

  if (!customer) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid phone number.' },
      { status: 404 }
    );
  }

  // Find valid OTP
  const [otpRecord] = await Database.select()
    .from(PasswordResetOtps)
    .where(
      and(
        eq(PasswordResetOtps.customerId, customer.id),
        eq(PasswordResetOtps.otp, otp.trim()),
        eq(PasswordResetOtps.used, false),
        sql`${PasswordResetOtps.expiresAt} > NOW()`
      )
    )
    .limit(1);

  if (!otpRecord) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid or expired OTP.' },
      { status: 400 }
    );
  }

  // Mark OTP as used
  await Database.update(PasswordResetOtps)
    .set({ used: true })
    .where(eq(PasswordResetOtps.id, otpRecord.id));

  // Generate a short-lived reset token (valid 15 minutes)
  const resetToken = await signJWT(
    { id: customer.id, purpose: 'password-reset' },
    '15m'
  );

  return NextResponse.json({
    error: false,
    message: 'OTP verified.',
    data: { resetToken },
  }, { status: 200 });
}