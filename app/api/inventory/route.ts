import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { validateInventoryData, normalizeInventoryBarcode } from '@/utils/inventory';
import { inventoryTriggers } from '@/triggers/inventory';

const SORT_FIELDS: Record<string, any> = {
  name: Inventory.name,
  quantity: Inventory.quantity,
  costPrice: Inventory.costPrice,
  sellingPrice: Inventory.sellingPrice,
  reorderLevel: Inventory.reorderLevel,
  barcode: Inventory.barcode,
  createdAt: Inventory.createdAt,
  updatedAt: Inventory.updatedAt,
  margin: sql`(${Inventory.sellingPrice} - ${Inventory.costPrice})`,
  stockValue: sql`(${Inventory.quantity} * ${Inventory.costPrice})`,
};

function parseFiniteNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildFilters(searchParams: URLSearchParams) {
  const conditions: any[] = [];

  const search = searchParams.get('search')?.trim() || '';
  const stock = searchParams.get('stock') || 'all';
  const active = searchParams.get('active') || 'all';
  const lowStockAlert = searchParams.get('lowStockAlert') || 'all';
  const unit = searchParams.get('unit')?.trim() || '';

  const minQuantity = parseFiniteNumber(searchParams.get('minQuantity'));
  const maxQuantity = parseFiniteNumber(searchParams.get('maxQuantity'));
  const minCost = parseFiniteNumber(searchParams.get('minCost'));
  const maxCost = parseFiniteNumber(searchParams.get('maxCost'));
  const minSelling = parseFiniteNumber(searchParams.get('minSelling'));
  const maxSelling = parseFiniteNumber(searchParams.get('maxSelling'));
  const dateFrom = searchParams.get('dateFrom')?.trim() || '';
  const dateTo = searchParams.get('dateTo')?.trim() || '';

  if (search) {
    conditions.push(
      or(
        ilike(Inventory.name, `%${search}%`),
        ilike(Inventory.description, `%${search}%`),
        ilike(Inventory.barcode, `%${search}%`),
        ilike(Inventory.unit, `%${search}%`),
      ),
    );
  }

  if (stock === 'healthy') {
    conditions.push(sql`${Inventory.quantity} > ${Inventory.reorderLevel}`);
  } else if (stock === 'low') {
    conditions.push(sql`${Inventory.quantity} <= ${Inventory.reorderLevel}`);
  } else if (stock === 'out') {
    conditions.push(lte(Inventory.quantity, 0));
  }

  if (active === 'true') {
    conditions.push(eq(Inventory.active, true));
  } else if (active === 'false') {
    conditions.push(eq(Inventory.active, false));
  }

  if (lowStockAlert === 'true') {
    conditions.push(eq(Inventory.lowStockAlert, true));
  } else if (lowStockAlert === 'false') {
    conditions.push(eq(Inventory.lowStockAlert, false));
  }

  if (unit) {
    conditions.push(eq(Inventory.unit, unit));
  }

  if (minQuantity !== undefined) {
    conditions.push(gte(Inventory.quantity, Math.floor(minQuantity)));
  }

  if (maxQuantity !== undefined) {
    conditions.push(lte(Inventory.quantity, Math.floor(maxQuantity)));
  }

  if (minCost !== undefined) {
    conditions.push(gte(Inventory.costPrice, minCost.toFixed(2)));
  }

  if (maxCost !== undefined) {
    conditions.push(lte(Inventory.costPrice, maxCost.toFixed(2)));
  }

  if (minSelling !== undefined) {
    conditions.push(gte(Inventory.sellingPrice, minSelling.toFixed(2)));
  }

  if (maxSelling !== undefined) {
    conditions.push(lte(Inventory.sellingPrice, maxSelling.toFixed(2)));
  }

  if (dateFrom) {
    conditions.push(sql`${Inventory.createdAt}::date >= ${dateFrom}::date`);
  }

  if (dateTo) {
    conditions.push(sql`${Inventory.createdAt}::date <= ${dateTo}::date`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const limit = Math.min(
    500,
    parsePositiveInteger(searchParams.get('limit'), 50),
  );
  const offset = (page - 1) * limit;

  const sortBy = searchParams.get('sortBy') || 'name';
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
  const whereClause = buildFilters(searchParams);
  const sortColumn = SORT_FIELDS[sortBy] || Inventory.name;

  try {
    const countQuery = Database
      .select({ count: sql<number>`count(*)` })
      .from(Inventory);

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    let dataQuery = Database
      .select()
      .from(Inventory);

    if (whereClause) {
      dataQuery = dataQuery.where(whereClause);
    }

    dataQuery = dataQuery
      .orderBy(sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn))
      .limit(limit)
      .offset(offset);

    const items = await dataQuery;

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory retrieved.',
        data: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/inventory] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Unable to fetch inventory.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

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

  const errors = validateInventoryData(body);

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

  const barcode = normalizeInventoryBarcode(body.barcode);

  try {
    const [newItem] = await Database
      .insert(Inventory)
      .values({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        barcode,
        quantity: Number(body.quantity) || 0,
        unit: body.unit.trim(),
        costPrice: Number(body.costPrice || 0).toFixed(2),
        sellingPrice: Number(body.sellingPrice || 0).toFixed(2),
        reorderLevel: Number(body.reorderLevel) || 0,
        lowStockAlert:
          body.lowStockAlert !== undefined
            ? Boolean(body.lowStockAlert)
            : true,
        active:
          body.active !== undefined
            ? Boolean(body.active)
            : true,
      })
      .returning();

    inventoryTriggers
      .onNewItem({ itemName: newItem.name })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message: 'Inventory item created.',
        data: newItem,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[POST /api/inventory] Error:', error);

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
        errorTitle: 'Database insertion failed',
        errorMessage: 'Could not create inventory item.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
