import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { PhoneVerificationOtps } from '@/database/models/customers/phone-verification-otps.model';
import { eq, and, sql } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { signJWT } from '@/utils/jwt';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { customerId, otp, newPhone } = body;
  
  if (!customerId || !isValidUUID(customerId)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Valid customer ID is required.' },
      { status: 422 }
    );
  }
  if (!otp || typeof otp !== 'string' || otp.length !== 6) {
    return NextResponse.json(
      { error: true, errorMessage: 'Valid 6-digit OTP is required.' },
      { status: 422 }
    );
  }

  // Fetch customer
  const [customer] = await Database.select()
    .from(Customers)
    .where(eq(Customers.id, customerId))
    .limit(1);

  if (!customer) {
    return NextResponse.json(
      { error: true, errorMessage: 'Customer not found.' },
      { status: 404 }
    );
  }

  // Find valid OTP
  const [otpRecord] = await Database.select()
    .from(PhoneVerificationOtps)
    .where(
      and(
        eq(PhoneVerificationOtps.customerId, customerId),
        eq(PhoneVerificationOtps.otp, otp.trim()),
        eq(PhoneVerificationOtps.used, false),
        sql`${PhoneVerificationOtps.expiresAt} > NOW()`
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
  await Database.update(PhoneVerificationOtps)
    .set({ used: true })
    .where(eq(PhoneVerificationOtps.id, otpRecord.id));

  // Update customer: set isPhoneVerified = true and update phone if newPhone provided
  const updateData: any = { isPhoneVerified: true };
  if (newPhone && typeof newPhone === 'string' && newPhone.trim().length > 0) {
    const newPhoneTrim = newPhone.trim();
    // Check uniqueness
    const [existing] = await Database.select()
      .from(Customers)
      .where(eq(Customers.phone, newPhoneTrim));
    if (existing && existing.id !== customerId) {
      return NextResponse.json(
        { error: true, errorMessage: 'Phone number is already in use.' },
        { status: 409 }
      );
    }
    updateData.phone = newPhoneTrim;
  }

  await Database.update(Customers)
    .set(updateData)
    .where(eq(Customers.id, customerId));

  // Fetch updated customer
  const [updatedCustomer] = await Database.select()
    .from(Customers)
    .where(eq(Customers.id, customerId));

  // Remove password
  const { password, ...customerWithoutPassword } = updatedCustomer;

  // Generate a new token
  const token = await signJWT({ id: customerWithoutPassword.id, email: customerWithoutPassword.email }, '7d');

  return NextResponse.json({
    error: false,
    message: 'Phone verified successfully.',
    data: {
      customer: customerWithoutPassword,
      token,
    },
  }, { status: 200 });
}