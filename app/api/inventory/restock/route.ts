import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Inventory } from "@/database/models/inventory/inventory.model";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { inventoryTriggers } from "@/triggers/inventory";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: true, errorType: "fe", errorTitle: "Invalid JSON", errorMessage: "Request body must be valid JSON." }, { status: 400 });
  }
  const { itemId, quantity } = body;
  if (!itemId || !isValidUUID(itemId)) {
    return NextResponse.json({ error: true, errorType: "fve", errorTitle: "Invalid item ID", errorMessage: "A valid UUID is required." }, { status: 422 });
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return NextResponse.json({ error: true, errorType: "fve", errorTitle: "Invalid quantity", errorMessage: "Quantity must be a positive number." }, { status: 422 });
  }

  try {
    const [item] = await Database.select().from(Inventory).where(eq(Inventory.id, itemId)).limit(1);
    if (!item) {
      return NextResponse.json({ error: true, errorType: "auth", errorTitle: "Item not found", errorMessage: "Inventory item does not exist." }, { status: 404 });
    }
    const newQuantity = item.quantity + quantity;
    await Database.update(Inventory).set({ quantity: newQuantity, updatedAt: new Date() }).where(eq(Inventory.id, itemId));

    inventoryTriggers.onRestock({
      itemName: item.name,
      quantity: quantity,
    }).catch(console.error);
    
    return NextResponse.json({ error: false, message: "Stock added.", newQuantity }, { status: 200 });
  } catch (e) {
    console.error("[POST /api/inventory/restock] Error:", e);
    return NextResponse.json({ error: true, errorType: "dbe", errorTitle: "Database update error", errorMessage: "Could not restock item." }, { status: 500 });
  }
}