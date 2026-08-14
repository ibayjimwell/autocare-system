import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { PhoneVerificationOtps } from '@/database/models/customers/phone-verification-otps.model';
import { eq } from 'drizzle-orm';
import { generateOTP } from '@/utils/otp';
import { sendSMS } from '@/utils/sms';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { customerId, newPhone } = body;
  if (!customerId) {
    return NextResponse.json(
      { error: true, errorMessage: 'Customer ID is required.' },
      { status: 422 }
    );
  }

  // Determine the phone number to send OTP to
  let phoneToUse = newPhone;
  let customer;

  // Fetch customer
  const [found] = await Database.select()
    .from(Customers)
    .where(eq(Customers.id, customerId))
    .limit(1);
  customer = found;

  if (!customer) {
    return NextResponse.json(
      { error: true, errorMessage: 'Customer not found.' },
      { status: 404 }
    );
  }

  // If no newPhone provided, use existing phone
  if (!phoneToUse) {
    phoneToUse = customer.phone;
  } else {
    // If new phone is provided, check if it's already taken by another customer
    const [existing] = await Database.select()
      .from(Customers)
      .where(eq(Customers.phone, phoneToUse))
      .limit(1);
    if (existing && existing.id !== customerId) {
      return NextResponse.json(
        { error: true, errorMessage: 'Phone number already in use by another account.' },
        { status: 409 }
      );
    }
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP (invalidate previous unused OTPs for this customer? We'll just insert new one and mark old ones as used if needed)
  await Database.insert(PhoneVerificationOtps).values({
    customerId: customer.id,
    phone: phoneToUse,
    otp,
    expiresAt,
    used: false,
  });

  // Send SMS
  const message = `Your AutoCare phone verification OTP is: ${otp}. Valid for 10 minutes.`;
  await sendSMS(phoneToUse, message);

  return NextResponse.json({
    error: false,
    message: 'OTP sent.',
    data: { phone: phoneToUse },
  }, { status: 200 });
}