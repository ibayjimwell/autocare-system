import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import {
  normalizeInventoryBarcode,
  validateInventoryData,
} from '@/utils/inventory';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid inventory item ID.' },
      { status: 422 },
    );
  }

  try {
    const [item] = await Database
      .select()
      .from(Inventory)
      .where(eq(Inventory.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        {
          error: true,
          errorMessage: 'Inventory item does not exist.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory item retrieved.',
        data: item,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[GET /api/inventory/[id]] Error:', error);
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Unable to fetch inventory item.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid ID',
        errorMessage: 'ID must be a valid UUID.',
      },
      { status: 422 },
    );
  }

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

  try {
    const [existing] = await Database
      .select()
      .from(Inventory)
      .where(eq(Inventory.id, id))
      .limit(1);

    if (!existing) {
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

    const merged = {
      name:
        body.name !== undefined
          ? body.name
          : existing.name,
      description:
        body.description !== undefined
          ? body.description
          : existing.description,
      barcode:
        body.barcode !== undefined
          ? body.barcode
          : existing.barcode,
      quantity:
        body.quantity !== undefined
          ? body.quantity
          : existing.quantity,
      unit:
        body.unit !== undefined
          ? body.unit
          : existing.unit,
      costPrice:
        body.costPrice !== undefined
          ? body.costPrice
          : existing.costPrice,
      sellingPrice:
        body.sellingPrice !== undefined
          ? body.sellingPrice
          : existing.sellingPrice,
      reorderLevel:
        body.reorderLevel !== undefined
          ? body.reorderLevel
          : existing.reorderLevel,
      lowStockAlert:
        body.lowStockAlert !== undefined
          ? body.lowStockAlert
          : existing.lowStockAlert,
      active:
        body.active !== undefined
          ? body.active
          : existing.active,
    };

    const errors = validateInventoryData(merged);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle: 'Validation failed',
          errorMessage: errors.join(' '),
        },
        { status: 422 },
      );
    }

    const updateData: any = {
      name: String(merged.name).trim(),
      description:
        merged.description === null || merged.description === undefined
          ? null
          : String(merged.description).trim() || null,
      barcode: normalizeInventoryBarcode(merged.barcode),
      quantity: Number(merged.quantity),
      unit: String(merged.unit).trim(),
      costPrice: Number(merged.costPrice).toFixed(2),
      sellingPrice: Number(merged.sellingPrice).toFixed(2),
      reorderLevel: Number(merged.reorderLevel),
      lowStockAlert: Boolean(merged.lowStockAlert),
      active: Boolean(merged.active),
      updatedAt: new Date(),
    };

    const [updated] = await Database
      .update(Inventory)
      .set(updateData)
      .where(eq(Inventory.id, id))
      .returning();

    if (!updated) {
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

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory item updated.',
        data: updated,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('[PUT /api/inventory/[id]] Error:', error);

    if (error?.code === '23505') {
      return NextResponse.json(
        {
          error: true,
          errorType: 'duplicate',
          errorTitle: 'Duplicate barcode',
          errorMessage: 'An inventory item with this barcode already exists.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database update error',
        errorMessage: 'Could not update inventory item.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid ID',
        errorMessage: 'ID must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  try {
    const [deleted] = await Database
      .delete(Inventory)
      .where(eq(Inventory.id, id))
      .returning({ id: Inventory.id });

    if (!deleted) {
      return NextResponse.json(
        {
          error: true,
          errorMessage: 'Inventory item does not exist.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory item deleted.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[DELETE /api/inventory/[id]] Error:', error);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database deletion error',
        errorMessage: 'Could not delete inventory item.',
      },
      { status: 500 },
    );
  }
}
