import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Inventory } from "@/database/models/inventory/inventory.model";
import { PosTransaction } from "@/database/models/inventory/pos-transaction.model";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: true, errorMessage: "Invalid JSON" }, { status: 400 });
  }

  const { items, paymentReceived, staffId } = body;

  // Validate input
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: true, errorMessage: "No items provided." }, { status: 422 });
  }
  if (typeof paymentReceived !== 'number' || paymentReceived <= 0) {
    return NextResponse.json({ error: true, errorMessage: "Payment amount required." }, { status: 422 });
  }

  // Fetch inventory items
  const itemIds = items.map((i: any) => i.id);
  const inventoryItems = await Database.select()
    .from(Inventory)
    .where(inArray(Inventory.id, itemIds));

  const inventoryMap = new Map(inventoryItems.map(i => [i.id, i]));

  // Validate stock availability and compute total
  let totalAmount = 0;
  const processedItems = [];

  for (const cartItem of items) {
    const inv = inventoryMap.get(cartItem.id);
    if (!inv) {
      return NextResponse.json(
        { error: true, errorMessage: `Item not found: ${cartItem.name || cartItem.id}` },
        { status: 404 }
      );
    }
    if (inv.quantity < cartItem.quantity) {
      return NextResponse.json(
        { error: true, errorMessage: `Not enough stock for ${inv.name}` },
        { status: 400 }
      );
    }
    const lineTotal = parseFloat(inv.sellingPrice) * cartItem.quantity;
    totalAmount += lineTotal;
    processedItems.push({
      id: inv.id,
      name: inv.name,
      quantity: cartItem.quantity,
      sellingPrice: inv.sellingPrice,
      lineTotal: lineTotal.toFixed(2),
    });
  }

  const changeGiven = paymentReceived - totalAmount;
  if (changeGiven < 0) {
    return NextResponse.json({ error: true, errorMessage: "Insufficient payment." }, { status: 400 });
  }

  // Use a transaction to ensure atomicity
  try {
    const result = await Database.transaction(async (tx) => {
      // Deduct stock for each item
      for (const cartItem of items) {
        const inv = inventoryMap.get(cartItem.id)!;
        await tx
          .update(Inventory)
          .set({
            quantity: inv.quantity - cartItem.quantity,
            updatedAt: new Date(),
          })
          .where(eq(Inventory.id, inv.id));
      }

      // Insert POS transaction record
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

      return inserted;
    });

    return NextResponse.json(
      { error: false, message: "Sale completed.", data: result },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /api/pos] Error:", e);
    return NextResponse.json(
      { error: true, errorMessage: "Transaction failed." },
      { status: 500 }
    );
  }
}