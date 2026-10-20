import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { PasswordResetOtps } from '@/database/models/customers/password-reset-otps.model';
import { eq, or } from 'drizzle-orm';
import { normalizePhilippinePhone, isValidPhilippinePhone, formatPhilippinePhoneLocal } from '@/utils/phone';
import { generateOTP } from '@/utils/otp';
import { sendSMS } from '@/utils/sms'; // we'll implement this

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { phone } = body;
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return NextResponse.json(
      { error: true, errorMessage: 'Phone number is required.' },
      { status: 422 }
    );
  }

  // Customer records are stored as +639... but the mobile screen often
  // submits 09...; match the canonical format and its common legacy variants.
  if (!isValidPhilippinePhone(phone)) {
    return NextResponse.json({ error: true, errorMessage: 'Enter a valid Philippine mobile number.' }, { status: 422 });
  }
  const canonicalPhone = normalizePhilippinePhone(phone);
  const localPhone = formatPhilippinePhoneLocal(canonicalPhone);
  const internationalDigits = canonicalPhone.slice(1);
  const localDigits = canonicalPhone.slice(3);
  const [customer] = await Database.select()
    .from(Customers)
    .where(or(
      eq(Customers.phone, canonicalPhone),
      eq(Customers.phone, localPhone),
      eq(Customers.phone, internationalDigits),
      eq(Customers.phone, localDigits),
    ))
    .limit(1);

  if (!customer) {
    return NextResponse.json(
      { error: true, errorMessage: 'No account found with this phone number.' },
      { status: 404 }
    );
  }

  if (customer.deactivated) {
    return NextResponse.json(
      { error: true, errorMessage: 'Account is deactivated. Contact support.' },
      { status: 403 }
    );
  }

  // Generate 6-digit OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP
  await Database.insert(PasswordResetOtps).values({
    customerId: customer.id,
    otp,
    expiresAt,
    used: false,
  });

  // Send OTP via SMS
  const message = `Your AutoCare password reset OTP is: ${otp}. Valid for 10 minutes.`;
  await sendSMS(customer.phone, message);

  return NextResponse.json({
    error: false,
    message: 'OTP sent to your phone.',
    data: { customerId: customer.id },
  }, { status: 200 });
}