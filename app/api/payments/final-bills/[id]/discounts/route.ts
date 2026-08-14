import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillDiscounts } from '@/database/models/payments/final-bill-discounts.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: billId } = await params;
  if (!isValidUUID(billId)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid bill ID' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { title, type, value } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json(
      { error: true, errorMessage: 'Title is required.' },
      { status: 422 }
    );
  }
  if (!type || !['fixed', 'percentage'].includes(type)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Type must be "fixed" or "percentage".' },
      { status: 422 }
    );
  }
  if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
    return NextResponse.json(
      { error: true, errorMessage: 'Value must be a positive number.' },
      { status: 422 }
    );
  }

  try {
    const [bill] = await Database.select()
      .from(FinalBill)
      .where(eq(FinalBill.id, billId));
    if (!bill) {
      return NextResponse.json(
        { error: true, errorMessage: 'Final bill not found.' },
        { status: 404 }
      );
    }
    if (bill.status !== 'PENDING') {
      return NextResponse.json(
        { error: true, errorMessage: 'Only PENDING bills can be edited.' },
        { status: 422 }
      );
    }

    const numericValue = parseFloat(value);
    let amount = 0;
    if (type === 'fixed') {
      amount = numericValue;
    } else {
      // percentage: apply to grand total before discount
      const beforeDiscount = parseFloat(bill.grandTotal) || 0;
      amount = (beforeDiscount * numericValue) / 100;
    }

    const [newDiscount] = await Database.insert(FinalBillDiscounts)
      .values({
        finalBillId: billId,
        title: title.trim(),
        type,
        value: numericValue.toString(),
        amount: amount.toString(),
      })
      .returning();

    // Recalculate totals
    const allDiscounts = await Database.select()
      .from(FinalBillDiscounts)
      .where(eq(FinalBillDiscounts.finalBillId, billId));
    const newDiscountTotal = allDiscounts.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    const serviceSub = parseFloat(bill.serviceSubtotal);
    const findingsSub = parseFloat(bill.findingsSubtotal);
    const workTasksSub = parseFloat(bill.workTasksSubtotal);
    const feesTotal = parseFloat(bill.feesTotal);
    const newGrandTotal = serviceSub + findingsSub + workTasksSub + feesTotal - newDiscountTotal;

    await Database.update(FinalBill)
      .set({
        discountTotal: newDiscountTotal.toString(),
        grandTotal: newGrandTotal.toString(),
        updatedAt: new Date(),
      })
      .where(eq(FinalBill.id, billId));

    return NextResponse.json({
      error: false,
      message: 'Discount added.',
      data: newDiscount,
    }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/payments/final-bills/[id]/discounts] Error:', e);
    return NextResponse.json({
      error: true,
      errorMessage: 'Could not add discount.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}