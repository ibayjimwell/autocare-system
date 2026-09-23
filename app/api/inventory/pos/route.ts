import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { PosTransaction } from '@/database/models/inventory/pos-transaction.model';
import { eq, inArray } from 'drizzle-orm';
import { inventoryTriggers } from '@/triggers/inventory';

export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid JSON.' },
      { status: 400 },
    );
  }

  const { items, paymentReceived, staffId } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: true, errorMessage: 'No items provided.' },
      { status: 422 },
    );
  }

  if (
    typeof paymentReceived !== 'number' ||
    !Number.isFinite(paymentReceived) ||
    paymentReceived <= 0
  ) {
    return NextResponse.json(
      { error: true, errorMessage: 'Payment amount required.' },
      { status: 422 },
    );
  }

  try {
    const itemIds = items.map((item: any) => item?.id).filter(Boolean);

    if (itemIds.length !== items.length) {
      return NextResponse.json(
        { error: true, errorMessage: 'Every POS item must have a valid inventory ID.' },
        { status: 422 },
      );
    }

    const result = await Database.transaction(async (tx) => {
      const inventoryItems = await tx
        .select()
        .from(Inventory)
        .where(inArray(Inventory.id, itemIds));

      const inventoryMap = new Map(
        inventoryItems.map((item) => [item.id, item]),
      );

      let totalAmount = 0;
      const processedItems: any[] = [];

      for (const cartItem of items) {
        const inv = inventoryMap.get(cartItem.id);

        if (!inv) {
          throw new Error(`Item not found: ${cartItem.name || cartItem.id}`);
        }

        const quantity = Number(cartItem.quantity);

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(`Invalid quantity for ${inv.name}.`);
        }

        if (inv.quantity < quantity) {
          throw new Error(`Not enough stock for ${inv.name}.`);
        }

        const sellingPrice = Number.parseFloat(String(inv.sellingPrice)) || 0;
        const lineTotal = sellingPrice * quantity;

        totalAmount += lineTotal;

        processedItems.push({
          id: inv.id,
          name: inv.name,
          quantity,
          sellingPrice: inv.sellingPrice,
          lineTotal: lineTotal.toFixed(2),
        });
      }

      totalAmount = Math.round(totalAmount * 100) / 100;

      const changeGiven = Math.round(
        (paymentReceived - totalAmount) * 100,
      ) / 100;

      if (changeGiven < 0) {
        throw new Error('Insufficient payment.');
      }

      for (const cartItem of items) {
        const inv = inventoryMap.get(cartItem.id)!;
        const nextQuantity = inv.quantity - Number(cartItem.quantity);

        await tx
          .update(Inventory)
          .set({
            quantity: nextQuantity,
            updatedAt: new Date(),
          })
          .where(eq(Inventory.id, inv.id));
      }

      const [inserted] = await tx
        .insert(PosTransaction)
        .values({
          items: processedItems,
          totalAmount: totalAmount.toFixed(2),
          paymentReceived: paymentReceived.toFixed(2),
          changeGiven: changeGiven.toFixed(2),
          staffId: staffId || null,
        })
        .returning();

      return {
        transaction: inserted,
        processedItems,
        totalAmount,
        changeGiven,
      };
    });

    inventoryTriggers
      .onPosSale({
        itemName: `${result.processedItems.length} item(s)`,
        transactionTotal: `₱${result.totalAmount.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        transactionId: result.transaction.id,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message: 'Sale completed.',
        data: result.transaction,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[POST /api/inventory/pos] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          error?.message || 'Transaction failed.',
      },
      { status: 400 },
    );
  }
}
