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
  FinalBillFindings,
} from '@/database/models/payments/final-bill-findings.model';

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

function isEditableStatus(
  status: unknown,
): boolean {
  const normalized = String(
    status || '',
  )
    .trim()
    .toUpperCase();

  return (
    normalized === 'PENDING' ||
    normalized === 'PARKED'
  );
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
        errorType: 'fve',
        errorTitle: 'Invalid Final Cost ID',
        errorMessage:
          'Final Cost ID must be a valid UUID.',
      },
      { status: 422 },
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid JSON',
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

  const findingId =
    body?.findingId &&
    body.findingId !== 'none'
      ? String(body.findingId)
      : null;

  if (!title) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Title required',
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
        errorType: 'fve',
        errorTitle: 'Invalid amount',
        errorMessage:
          'Fee amount must be greater than zero.',
      },
      { status: 422 },
    );
  }

  if (
    findingId &&
    !isValidUUID(findingId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid finding ID',
        errorMessage:
          'findingId must be a valid UUID.',
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

    if (!isEditableStatus(bill.status)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Fees can only be modified while the Final Cost is Pending or Parked.',
        },
        { status: 409 },
      );
    }

    if (findingId) {
      const [finding] =
        await Database
          .select({
            id: FinalBillFindings.id,
            findingId:
              FinalBillFindings.findingId,
          })
          .from(FinalBillFindings)
          .where(
            and(
              eq(
                FinalBillFindings.findingId,
                findingId,
              ),
              eq(
                FinalBillFindings.finalBillId,
                id,
              ),
            ),
          )
          .limit(1);

      if (!finding) {
        return NextResponse.json(
          {
            error: true,
            errorMessage:
              'The selected finding does not belong to this Final Cost.',
          },
          { status: 422 },
        );
      }
    }

    const [fee] =
      await Database
        .insert(FinalBillFees)
        .values({
          finalBillId: id,
          findingId,
          title,
          amount: amount.toFixed(2),
        })
        .returning();

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    return NextResponse.json(
      {
        error: false,
        message: 'Fee added.',
        data: {
          fee,
          bill: updatedBill,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      '[POST /api/payments/final-bills/[id]/fees] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Failed to add Final Cost fee.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
