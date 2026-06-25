import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { Inventory } from "@/database/models/inventory/inventory.model";
import { validateInventoryData } from "@/utils/inventory";
import { eq } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";

// ------------------------------------------------------------------
// PUT /api/inventory/[id] – Update inventory item
// ------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid ID",
      errorMessage: "ID must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({
      error: true,
      errorType: "fe",
      errorTitle: "Invalid JSON",
      errorMessage: "Request body must be valid JSON.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 400 });
  }

  const errors = validateInventoryData(body);
  if (errors.length > 0) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Validation failed",
      errorMessage: errors.join(" "),
      errorLog: errors,
    }, { status: 422 });
  }

  const updateData: any = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.unit) updateData.unit = body.unit.trim();
  if (body.price !== undefined) updateData.price = body.price;
  if (body.reorderLevel !== undefined) updateData.reorderLevel = body.reorderLevel;
  if (body.active !== undefined) updateData.active = body.active;
  updateData.updatedAt = new Date();

  try {
    const [updated] = await Database.update(Inventory)
      .set(updateData)
      .where(eq(Inventory.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({
        error: true,
        errorType: "auth",
        errorTitle: "Item not found",
        errorMessage: "Inventory item does not exist.",
        errorLog: null,
      }, { status: 404 });
    }
    return NextResponse.json({
      error: false,
      message: "Inventory item updated.",
      data: updated,
    }, { status: 200 });
  } catch (e) {
    console.error("[PUT /api/inventory/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database update error",
      errorMessage: "Could not update inventory item.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// DELETE /api/inventory/[id] – Delete inventory item
// ------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({
      error: true,
      errorType: "fve",
      errorTitle: "Invalid ID",
      errorMessage: "ID must be a valid UUID.",
      errorLog: null,
    }, { status: 422 });
  }

  try {
    await Database.delete(Inventory).where(eq(Inventory.id, id));
    return NextResponse.json({
      error: false,
      message: "Inventory item deleted.",
    }, { status: 200 });
  } catch (e) {
    console.error("[DELETE /api/inventory/[id]] Error:", e);
    return NextResponse.json({
      error: true,
      errorType: "dbe",
      errorTitle: "Database deletion error",
      errorMessage: "Could not delete inventory item.",
      errorLog: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}