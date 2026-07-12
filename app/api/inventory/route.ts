import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Inventory } from "@/database/models/inventory/inventory.model";
import { validateInventoryData } from "@/utils/inventory";
import { eq, sql } from "drizzle-orm";
import { inventoryTriggers } from "@/triggers/inventory";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  try {
    let query = Database.select().from(Inventory);
    if (search) {
      query = query.where(
        sql`${Inventory.name} ILIKE ${'%' + search + '%'} OR ${Inventory.description} ILIKE ${'%' + search + '%'}`
      );
    }
    const [countResult] = await Database.select({ count: sql`count(*)` })
      .from(Inventory)
      .where(query._where);
    const total = Number(countResult?.count || 0);
    const items = await query.orderBy(Inventory.name).limit(limit).offset(offset);

    return NextResponse.json({
      error: false,
      message: "Inventory retrieved.",
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/inventory] Error:", e);
    return NextResponse.json({
      error: true, errorType: "dbe", errorTitle: "Database error",
      errorMessage: "Unable to fetch inventory.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: true, errorType: "fe", errorTitle: "Invalid JSON", errorMessage: "Request body must be valid JSON." }, { status: 400 });
  }

  const errors = validateInventoryData(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: true, errorType: "fve", errorTitle: "Validation failed", errorMessage: errors.join(" ") }, { status: 422 });
  }

  try {
    const [newItem] = await Database.insert(Inventory).values({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      quantity: body.quantity || 0,
      unit: body.unit.trim(),
      costPrice: body.costPrice || '0',
      sellingPrice: body.sellingPrice || '0',
      reorderLevel: body.reorderLevel || 0,
      lowStockAlert: body.lowStockAlert !== undefined ? body.lowStockAlert : true,
      active: body.active !== undefined ? body.active : true,
    }).returning();

    inventoryTriggers.onNewItem({ itemName: newItem.name }).catch(console.error);
    
    return NextResponse.json({ error: false, message: "Inventory item created.", data: newItem }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/inventory] Error:", e);
    return NextResponse.json({ error: true, errorType: "dbe", errorTitle: "Database insertion failed", errorMessage: "Could not create inventory item." }, { status: 500 });
  }
}