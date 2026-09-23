import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { PosTransaction } from '@/database/models/inventory/pos-transaction.model';
import { and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim() || '';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const pageValue = Number.parseInt(searchParams.get('page') || '1', 10);
  const limitValue = Number.parseInt(searchParams.get('limit') || '20', 10);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = Math.min(50, Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 20);
  const offset = (page - 1) * limit;

  try {
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        sql`exists (
          select 1
          from jsonb_array_elements(${PosTransaction.items}) as item
          where item->>'name' ilike ${'%' + search + '%'}
        )`,
      );
    }

    if (dateFrom) {
      conditions.push(
        sql`${PosTransaction.createdAt}::date >= ${dateFrom}::date`,
      );
    }

    if (dateTo) {
      conditions.push(
        sql`${PosTransaction.createdAt}::date <= ${dateTo}::date`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countQuery = Database
      .select({ count: sql<number>`count(*)` })
      .from(PosTransaction);

    if (whereClause) countQuery.where(whereClause);

    const [totalResult] = await countQuery;
    const total = Number(totalResult?.count || 0);

    let dataQuery = Database
      .select()
      .from(PosTransaction)
      .orderBy(desc(PosTransaction.createdAt))
      .limit(limit)
      .offset(offset);

    if (whereClause) dataQuery = dataQuery.where(whereClause);

    const transactions = await dataQuery;

    return NextResponse.json(
      {
        error: false,
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[GET /api/inventory/pos/history]', error);
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Failed to fetch transaction history.',
      },
      { status: 500 },
    );
  }
}
