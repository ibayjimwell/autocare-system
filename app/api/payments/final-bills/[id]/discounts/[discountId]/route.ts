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
  and,
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

async function getBillAndDiscount(
  billId: string,
  discountId: string,
) {
  const [bill, discount] =
    await Promise.all([
      Database
        .select()
        .from(FinalBill)
        .where(
          eq(
            FinalBill.id,
            billId,
          ),
        )
        .limit(1),

      Database
        .select()
        .from(FinalBillDiscounts)
        .where(
          and(
            eq(
              FinalBillDiscounts.id,
              discountId,
            ),
            eq(
              FinalBillDiscounts.finalBillId,
              billId,
            ),
          ),
        )
        .limit(1),
    ]);

  return {
    bill: bill[0] ?? null,
    discount:
      discount[0] ?? null,
  };
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      discountId: string;
    }>;
  },
) {
  const {
    id,
    discountId,
  } = await params;

  if (
    !isValidUUID(id) ||
    !isValidUUID(discountId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost or discount ID.',
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
    const {
      bill,
      discount,
    } = await getBillAndDiscount(
      id,
      discountId,
    );

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

    if (!discount) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Discount not found for this Final Cost.',
        },
        { status: 404 },
      );
    }

    if (!editable(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Discounts can only be edited while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    const [updatedDiscount] =
      await Database
        .update(FinalBillDiscounts)
        .set({
          title,
          type,
          value: value.toFixed(2),
          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              FinalBillDiscounts.id,
              discountId,
            ),
            eq(
              FinalBillDiscounts.finalBillId,
              id,
            ),
          ),
        )
        .returning();

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    return NextResponse.json(
      {
        error: false,
        message:
          'Discount updated.',
        data: {
          discount:
            updatedDiscount,
          bill: updatedBill,
        },
      },
    );
  } catch (error) {
    console.error(
      '[PATCH /api/payments/final-bills/[id]/discounts/[discountId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to update Final Cost discount.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      discountId: string;
    }>;
  },
) {
  void req;

  const {
    id,
    discountId,
  } = await params;

  if (
    !isValidUUID(id) ||
    !isValidUUID(discountId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost or discount ID.',
      },
      { status: 422 },
    );
  }

  try {
    const {
      bill,
      discount,
    } = await getBillAndDiscount(
      id,
      discountId,
    );

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

    if (!discount) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Discount not found for this Final Cost.',
        },
        { status: 404 },
      );
    }

    if (!editable(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Discounts can only be removed while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    await Database
      .delete(FinalBillDiscounts)
      .where(
        and(
          eq(
            FinalBillDiscounts.id,
            discountId,
          ),
          eq(
            FinalBillDiscounts.finalBillId,
            id,
          ),
        ),
      );

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    return NextResponse.json(
      {
        error: false,
        message:
          'Discount removed.',
        data: updatedBill,
      },
    );
  } catch (error) {
    console.error(
      '[DELETE /api/payments/final-bills/[id]/discounts/[discountId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to remove Final Cost discount.',
      },
      { status: 500 },
    );
  }
}
