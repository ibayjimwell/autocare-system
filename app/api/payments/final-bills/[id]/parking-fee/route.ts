import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid bill ID' }, { status: 400 });
  }

  const [bill] = await Database.select()
    .from(FinalBill)
    .where(eq(FinalBill.id, id));
  if (!bill) {
    return NextResponse.json({ error: true, errorMessage: 'Bill not found' }, { status: 404 });
  }

  if (bill.status !== 'HOLD' || !bill.holdStartedAt) {
    return NextResponse.json({ error: true, errorMessage: 'Bill is not on hold' }, { status: 400 });
  }

  const now = new Date();
  const diffMs = now.getTime() - new Date(bill.holdStartedAt).getTime();
  const rate = parseFloat(bill.parkingFeeRate);
  const unit = bill.parkingFeeUnit;
  let fee = 0;
  if (unit === 'minute') {
    fee = (diffMs / 60000) * rate;
  } else if (unit === 'hour') {
    fee = (diffMs / 3600000) * rate;
  } else if (unit === 'day') {
    fee = (diffMs / 86400000) * rate;
  }
  fee = Math.round(fee * 100) / 100;

  return NextResponse.json({
    error: false,
    data: {
      fee,
      rate,
      unit,
      elapsedMinutes: diffMs / 60000,
      elapsedHours: diffMs / 3600000,
      elapsedDays: diffMs / 86400000,
      startedAt: bill.holdStartedAt,
    },
  }, { status: 200 });
}