import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBillFindingParts } from '@/database/models/payments/final-bill-finding-parts.model';
import { FinalBillFindings } from '@/database/models/payments/final-bill-findings.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { eq, and } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string; partId: string }> }
) {
  const { id: billId, findingId, partId } = await params;
  if (!isValidUUID(billId) || !isValidUUID(findingId) || !isValidUUID(partId)) {
    return NextResponse.json({
      error: true,
      errorType: 'fve',
      errorTitle: 'Invalid IDs',
      errorMessage: 'Bill, finding, and part IDs must be valid UUIDs.',
      errorLog: null,
    }, { status: 422 });
  }

  try {
    // Verify bill exists and is PENDING
    const [bill] = await Database.select().from(FinalBill).where(eq(FinalBill.id, billId));
    if (!bill) {
      return NextResponse.json({
        error: true,
        errorType: 'auth',
        errorTitle: 'Bill not found',
        errorMessage: 'Final bill does not exist.',
        errorLog: null,
      }, { status: 404 });
    }
    if (bill.status !== 'PENDING') {
      return NextResponse.json({
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid status',
        errorMessage: 'Only PENDING bills can be edited.',
        errorLog: null,
      }, { status: 422 });
    }

    // Find the part
    const [part] = await Database.select().from(FinalBillFindingParts)
      .where(and(
        eq(FinalBillFindingParts.id, partId),
        eq(FinalBillFindingParts.finalBillFindingId, findingId)
      ));
    if (!part) {
      return NextResponse.json({
        error: true,
        errorType: 'auth',
        errorTitle: 'Part not found',
        errorMessage: 'The part does not belong to this finding or bill.',
        errorLog: null,
      }, { status: 404 });
    }

    const body = await req.json();
    const { quantity, priceAtTime } = body;

    if (quantity === undefined && priceAtTime === undefined) {
      return NextResponse.json({
        error: true,
        errorType: 'fve',
        errorTitle: 'No changes',
        errorMessage: 'Provide quantity and/or priceAtTime to update.',
        errorLog: null,
      }, { status: 400 });
    }

    const newQuantity = quantity !== undefined ? parseInt(quantity, 10) : part.quantity;
    const newPrice = priceAtTime !== undefined ? parseFloat(priceAtTime) : parseFloat(part.priceAtTime);
    const newTotal = (newQuantity * newPrice).toFixed(2);

    // Update the part
    await Database.update(FinalBillFindingParts)
      .set({
        quantity: newQuantity,
        priceAtTime: newPrice.toString(),
        totalPrice: newTotal,
      })
      .where(eq(FinalBillFindingParts.id, partId));

    // Recalculate finding's partsSubtotal
    const allParts = await Database.select().from(FinalBillFindingParts)
      .where(eq(FinalBillFindingParts.finalBillFindingId, findingId));
    const newPartsSubtotal = allParts.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0).toFixed(2);

    await Database.update(FinalBillFindings)
      .set({ partsSubtotal: newPartsSubtotal })
      .where(eq(FinalBillFindings.id, findingId));

    // Recalculate final bill totals
    const allFindings = await Database.select().from(FinalBillFindings)
      .where(eq(FinalBillFindings.finalBillId, billId));
    const includedFindings = allFindings.filter(f => f.included);
    const findingsSubtotal = includedFindings.reduce((sum, f) => sum + parseFloat(f.partsSubtotal), 0).toFixed(2);

    const serviceSub = parseFloat(bill.serviceSubtotal);
    const workTasksSub = parseFloat(bill.workTasksSubtotal);
    const feesTotal = parseFloat(bill.feesTotal);
    const discountTotal = parseFloat(bill.discountTotal);
    const newGrandTotal = (serviceSub + parseFloat(findingsSubtotal) + workTasksSub + feesTotal - discountTotal).toFixed(2);

    await Database.update(FinalBill)
      .set({
        findingsSubtotal: findingsSubtotal,
        grandTotal: newGrandTotal,
        updatedAt: new Date(),
      })
      .where(eq(FinalBill.id, billId));

    return NextResponse.json({
      error: false,
      message: 'Part updated successfully.',
      data: {
        id: part.id,
        quantity: newQuantity,
        priceAtTime: newPrice,
        totalPrice: newTotal,
      },
    }, { status: 200 });
  } catch (e) {
    console.error('[PATCH /api/payments/final-bills/.../parts] Error:', e);
    return NextResponse.json({
      error: true,
      errorType: 'dbe',
      errorTitle: 'Database error',
      errorMessage: 'Could not update part.',
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}