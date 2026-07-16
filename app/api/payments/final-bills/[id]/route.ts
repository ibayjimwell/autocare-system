// app/api/payments/final-bills/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFindings } from '@/database/models/payments/final-bill-findings.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { FinalBillDiscounts } from '@/database/models/payments/final-bill-discounts.model';
import { FinalBillWorkTasks } from '@/database/models/payments/final-bill-work-tasks.model';
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
    const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, id)).limit(1);

    if (!bill) {
      return NextResponse.json({ error: true, errorMessage: 'Final bill not found' }, { status: 404 });
    }

    const [findings, fees, discounts, workTasks] = await Promise.all([
      Database.select().from(FinalBillFindings).where(eq(FinalBillFindings.finalBillId, id)),
      Database.select().from(FinalBillFees).where(eq(FinalBillFees.finalBillId, id)),
      Database.select().from(FinalBillDiscounts).where(eq(FinalBillDiscounts.finalBillId, id)),
      Database.select().from(FinalBillWorkTasks).where(eq(FinalBillWorkTasks.finalBillId, id)),
    ]);

    const data = {
      ...bill,
      findings,
      fees,
      discounts,
      workTasks,
    };

    return NextResponse.json(
      { error: false, message: 'Final bill retrieved.', data },
      { status: 200 }
    );
  } catch (e) {
    console.error('[GET /api/payments/final-bills/[id]] Error:', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch final bill.',
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}