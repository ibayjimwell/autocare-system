import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  Database,
} from '@/lib/drizzle';

import {
  FinalBill,
} from '@/database/models/payments/final-bill.model';

import {
  FinalBillDiscounts,
} from '@/database/models/payments/final-bill-discounts.model';

import {
  eq,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  recalculateFinalBillTotals,
} from '@/utils/final-bill';

function editable(status: unknown) {
  const value = String(
    status || '',
  )
    .trim()
    .toUpperCase();

  return (
    value === 'PENDING' ||
    value === 'PARKED'
  );
}

function normalizeType(
  value: unknown,
): 'fixed' | 'percentage' | null {
  const type = String(
    value || '',
  )
    .trim()
    .toLowerCase();

  if (
    type === 'fixed' ||
    type === 'percentage'
  ) {
    return type;
  }

  return null;
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost ID.',
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
        errorMessage:
          'Request body must be valid JSON.',
      },
      { status: 400 },
    );
  }

  const title =
    typeof body?.title === 'string'
      ? body.title.trim()
      : '';

  const type =
    normalizeType(body?.type);

  const value = Number(
    body?.value,
  );

  if (!title) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Discount title is required.',
      },
      { status: 422 },
    );
  }

  if (!type) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Discount type must be fixed or percentage.',
      },
      { status: 422 },
    );
  }

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Discount value must be greater than zero.',
      },
      { status: 422 },
    );
  }

  if (
    type === 'percentage' &&
    value > 100
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Percentage discounts cannot exceed 100%.',
      },
      { status: 422 },
    );
  }

  try {
    const [bill] =
      await Database
        .select()
        .from(FinalBill)
        .where(
          eq(
            FinalBill.id,
            id,
          ),
        )
        .limit(1);

    if (!bill) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Final Cost not found.',
        },
        { status: 404 },
      );
    }

    if (!editable(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Discounts can only be modified while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    const [discount] =
      await Database
        .insert(FinalBillDiscounts)
        .values({
          finalBillId: id,
          title,
          type,
          value: value.toFixed(2),
          amount: '0.00',
        })
        .returning();

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    return NextResponse.json(
      {
        error: false,
        message: 'Discount added.',
        data: {
          discount,
          bill: updatedBill,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      '[POST /api/payments/final-bills/[id]/discounts] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to add Final Cost discount.',
      },
      { status: 500 },
    );
  }
}
