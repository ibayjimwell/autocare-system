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
  FinalBillFees,
} from '@/database/models/payments/final-bill-fees.model';

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

async function getBillAndFee(
  billId: string,
  feeId: string,
) {
  const [bill, fee] =
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
        .from(FinalBillFees)
        .where(
          and(
            eq(
              FinalBillFees.id,
              feeId,
            ),
            eq(
              FinalBillFees.finalBillId,
              billId,
            ),
          ),
        )
        .limit(1),
    ]);

  return {
    bill: bill[0] ?? null,
    fee: fee[0] ?? null,
  };
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      feeId: string;
    }>;
  },
) {
  const {
    id,
    feeId,
  } = await params;

  if (
    !isValidUUID(id) ||
    !isValidUUID(feeId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost or fee ID.',
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

  const amount = Number(
    body?.amount,
  );

  if (!title) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Fee title is required.',
      },
      { status: 422 },
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Fee amount must be greater than zero.',
      },
      { status: 422 },
    );
  }

  try {
    const {
      bill,
      fee,
    } = await getBillAndFee(
      id,
      feeId,
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

    if (!fee) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Fee not found for this Final Cost.',
        },
        { status: 404 },
      );
    }

    if (!editable(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Fees can only be edited while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    const [updatedFee] =
      await Database
        .update(FinalBillFees)
        .set({
          title,
          amount:
            amount.toFixed(2),
          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              FinalBillFees.id,
              feeId,
            ),
            eq(
              FinalBillFees.finalBillId,
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
        message: 'Fee updated.',
        data: {
          fee: updatedFee,
          bill: updatedBill,
        },
      },
    );
  } catch (error) {
    console.error(
      '[PATCH /api/payments/final-bills/[id]/fees/[feeId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to update Final Cost fee.',
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
      feeId: string;
    }>;
  },
) {
  void req;

  const {
    id,
    feeId,
  } = await params;

  if (
    !isValidUUID(id) ||
    !isValidUUID(feeId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost or fee ID.',
      },
      { status: 422 },
    );
  }

  try {
    const {
      bill,
      fee,
    } = await getBillAndFee(
      id,
      feeId,
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

    if (!fee) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Fee not found for this Final Cost.',
        },
        { status: 404 },
      );
    }

    if (!editable(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Fees can only be removed while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    await Database
      .delete(FinalBillFees)
      .where(
        and(
          eq(
            FinalBillFees.id,
            feeId,
          ),
          eq(
            FinalBillFees.finalBillId,
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
        message: 'Fee removed.',
        data: updatedBill,
      },
    );
  } catch (error) {
    console.error(
      '[DELETE /api/payments/final-bills/[id]/fees/[feeId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to remove Final Cost fee.',
      },
      { status: 500 },
    );
  }
}
