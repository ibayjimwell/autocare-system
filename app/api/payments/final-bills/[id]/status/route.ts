// app/api/payments/final-bills/[id]/status/route.ts
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

  try {
    const [bill] = await Database
      .select({ status: FinalBill.status })
      .from(FinalBill)
      .where(eq(FinalBill.id, id))
      .limit(1);

    if (!bill) {
      return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: false,
      message: 'Bill status retrieved.',
      data: { status: bill.status },
    }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/payments/final-bills/[id]/status] Error:', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch bill status.',
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}