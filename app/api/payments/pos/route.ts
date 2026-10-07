import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { PosTransaction } from '@/database/models/payments/pos-transaction.model';
import { eq, inArray } from 'drizzle-orm';
import { inventoryTriggers } from '@/triggers/inventory';
import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: true, errorMessage: 'Unauthorized.' }, { status: 401 });
  if (session.user.access?.payments !== true) return NextResponse.json({ error: true, errorMessage: 'Payments access is required.' }, { status: 403 });

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid JSON.' },
      { status: 400 },
    );
  }

  const { items, paymentReceived } = body || {};
  const staffId = session.user.id;

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

    await recordPaymentTransaction({
      entityType: 'POS', entityId: result.transaction.id, eventType: 'POS_SALE', amount: result.totalAmount,
      paymentMethod: 'CASH', actorStaffId: staffId || null,
      details: { items: result.processedItems, paymentReceived, changeGiven: result.changeGiven },
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
    console.error('[POST /api/payments/pos] Error:', error);

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
