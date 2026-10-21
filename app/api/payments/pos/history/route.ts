import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { PosTransaction } from '@/database/models/payments/pos-transaction.model';
import { and, desc, or, sql } from 'drizzle-orm';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized.' }, { status: 401 });
  }
  if (session.user.access?.payments !== true) {
    return NextResponse.json({ error: true, errorMessage: 'Payments access is required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim().slice(0, 150);
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const requestedPage = Number(searchParams.get('page'));
  const requestedLimit = Number(searchParams.get('limit'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 20;

  if ((dateFrom && !ISO_DATE.test(dateFrom)) || (dateTo && !ISO_DATE.test(dateTo)) ||
    (dateFrom && !Number.isFinite(Date.parse(`${dateFrom}T00:00:00Z`))) ||
    (dateTo && !Number.isFinite(Date.parse(`${dateTo}T00:00:00Z`)))) {
    return NextResponse.json({ error: true, errorMessage: 'Dates must use YYYY-MM-DD.' }, { status: 422 });
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json({ error: true, errorMessage: 'From date cannot be later than To date.' }, { status: 422 });
  }

  try {
    const conditions = [];
    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(
        sql`${PosTransaction.id}::text ILIKE ${pattern} ESCAPE '\\'`,
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${PosTransaction.items}) AS line
          WHERE line->>'name' ILIKE ${pattern} ESCAPE '\\'
             OR line->>'barcode' ILIKE ${pattern} ESCAPE '\\'
        )`,
      ));
    }
    if (dateFrom) conditions.push(sql`${PosTransaction.createdAt}::date >= ${dateFrom}::date`);
    if (dateTo) conditions.push(sql`${PosTransaction.createdAt}::date <= ${dateTo}::date`);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Drizzle's .where returns a new query builder; ignoring its result made
    // previous filtered counts incorrect. Apply the same condition to both.
    const [countRow] = await Database.select({ count: sql<number>`count(*)` })
      .from(PosTransaction)
      .where(whereClause);
    const total = Number(countRow?.count || 0);
    const pages = Math.max(1, Math.ceil(total / limit));
    const effectivePage = Math.min(page, pages);

    const transactions = await Database.select()
      .from(PosTransaction)
      .where(whereClause)
      .orderBy(desc(PosTransaction.createdAt), desc(PosTransaction.id))
      .limit(limit)
      .offset((effectivePage - 1) * limit);

    return NextResponse.json({
      error: false,
      data: transactions,
      pagination: { page: effectivePage, limit, total, pages },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[GET /api/payments/pos/history] Error:', error);
    return NextResponse.json({ error: true, errorMessage: 'Failed to fetch POS history.' }, { status: 500 });
  }
}
