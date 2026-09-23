import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { inventoryTriggers } from '@/triggers/inventory';

export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid JSON',
        errorMessage: 'Request body must be valid JSON.',
      },
      { status: 400 },
    );
  }

  const { itemId, quantity } = body || {};

  if (!itemId || !isValidUUID(itemId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid item ID',
        errorMessage: 'A valid UUID is required.',
      },
      { status: 422 },
    );
  }

  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid quantity',
        errorMessage: 'Quantity must be a positive whole number.',
      },
      { status: 422 },
    );
  }

  try {
    const result = await Database.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(Inventory)
        .where(eq(Inventory.id, itemId))
        .limit(1);

      if (!item) {
        return { item: null, newQuantity: null };
      }

      const newQuantity = item.quantity + quantity;

      const [updated] = await tx
        .update(Inventory)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(Inventory.id, itemId))
        .returning();

      return {
        item: updated,
        newQuantity,
      };
    });

    if (!result.item) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Item not found',
          errorMessage: 'Inventory item does not exist.',
        },
        { status: 404 },
      );
    }

    inventoryTriggers
      .onRestock({
        itemName: result.item.name,
        quantity,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message: 'Stock added.',
        data: result.item,
        newQuantity: result.newQuantity,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[POST /api/inventory/restock] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database update error',
        errorMessage: 'Could not restock item.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
