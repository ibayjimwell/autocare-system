// app/api/inventory/pos/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { PosTransaction } from "@/database/models/inventory/pos-transaction.model";
import { sql, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  try {
    // Build conditions array
    const conditions = [];

    if (search) {
      conditions.push(
        sql`exists (
          select 1
          from jsonb_array_elements(${PosTransaction.items}) as item
          where item->>'name' ilike ${'%' + search + '%'}
        )`
      );
    }
    if (dateFrom) {
      conditions.push(
        sql`${PosTransaction.createdAt}::date >= ${dateFrom}::date`
      );
    }
    if (dateTo) {
      conditions.push(
        sql`${PosTransaction.createdAt}::date <= ${dateTo}::date`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count matching transactions
    const countQuery = Database.select({ count: sql<number>`count(*)` })
      .from(PosTransaction);
    if (whereClause) countQuery.where(whereClause);
    const [totalResult] = await countQuery;
    const total = Number(totalResult?.count || 0);

    // Fetch page
    const dataQuery = Database.select()
      .from(PosTransaction)
      .orderBy(desc(PosTransaction.createdAt))
      .limit(limit)
      .offset(offset);
    if (whereClause) dataQuery.where(whereClause);
    const transactions = await dataQuery;

    return NextResponse.json({
      error: false,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/inventory/pos/history]", e);
    return NextResponse.json({
      error: true,
      errorMessage: "Failed to fetch transaction history.",
    }, { status: 500 });
  }
}