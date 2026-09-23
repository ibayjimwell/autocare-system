import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { normalizeInventoryBarcode } from '@/utils/inventory';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const barcode = normalizeInventoryBarcode(searchParams.get('barcode'));

  if (!barcode) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Barcode required',
        errorMessage: 'A barcode is required.',
      },
      { status: 400 },
    );
  }

  try {
    const [item] = await Database
      .select()
      .from(Inventory)
      .where(eq(Inventory.barcode, barcode))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'not_found',
          errorTitle: 'Item not found',
          errorMessage: 'No inventory item was found for this barcode.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory item found by barcode.',
        data: item,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/inventory/barcode] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to look up inventory barcode.',
      },
      { status: 500 },
    );
  }
}
