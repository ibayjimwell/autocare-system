import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// Read-only Final Cost status endpoint. Final Cost statuses can only change
// through verified Cash or PayPal settlement, never through a manual PATCH.
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } =
    await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid bill ID',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const [bill] =
      await Database
        .select({
          id:
            FinalBill.id,

          status:
            FinalBill.status,

          grandTotal:
            FinalBill.grandTotal,

          parkedAt:
            FinalBill.parkedAt,

          parkingFeeEnabled:
            FinalBill.parkingFeeEnabled,

          parkingFeeRate:
            FinalBill.parkingFeeRate,

          updatedAt:
            FinalBill.updatedAt,
        })
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
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        error: false,
        message:
          'Final Cost status retrieved.',
        data: bill,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error(
      '[GET /api/payments/final-bills/[id]/status] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Could not retrieve bill status.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: true, errorMessage: 'Invalid Final Cost ID.' }, { status: 400 });
  return NextResponse.json({ error: true, errorCode: 'FINAL_COST_LOCKED',
    errorMessage: 'Final Costs are Official when created and Paid only after settlement. Park and adjust Estimates before approval.' }, { status: 409 });
}
