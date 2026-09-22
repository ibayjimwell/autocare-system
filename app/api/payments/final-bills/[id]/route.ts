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
  FinalBillFindings,
} from '@/database/models/payments/final-bill-findings.model';

import {
  FinalBillFindingParts,
} from '@/database/models/payments/final-bill-finding-parts.model';

import {
  FinalBillFees,
} from '@/database/models/payments/final-bill-fees.model';

import {
  FinalBillDiscounts,
} from '@/database/models/payments/final-bill-discounts.model';

import {
  FinalBillWorkTasks,
} from '@/database/models/payments/final-bill-work-tasks.model';

import {
  eq,
  inArray,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

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
  void req;

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
            'Final Cost not found',
        },
        {
          status: 404,
        },
      );
    }

    const [
      findings,
      fees,
      discounts,
      workTasks,
    ] = await Promise.all([
      Database
        .select()
        .from(FinalBillFindings)
        .where(
          eq(
            FinalBillFindings.finalBillId,
            id,
          ),
        ),

      Database
        .select()
        .from(FinalBillFees)
        .where(
          eq(
            FinalBillFees.finalBillId,
            id,
          ),
        ),

      Database
        .select()
        .from(FinalBillDiscounts)
        .where(
          eq(
            FinalBillDiscounts.finalBillId,
            id,
          ),
        ),

      Database
        .select()
        .from(FinalBillWorkTasks)
        .where(
          eq(
            FinalBillWorkTasks.finalBillId,
            id,
          ),
        ),
    ]);

    /*
     * The previous endpoint returned FinalBillFindings without loading
     * FinalBillFindingParts. That made the detail modal show the finding
     * subtotal but no individual parts/items.
     */
    const parts =
      findings.length > 0
        ? await Database
            .select()
            .from(FinalBillFindingParts)
            .where(
              inArray(
                FinalBillFindingParts.finalBillFindingId,
                findings.map(
                  finding =>
                    finding.id,
                ),
              ),
            )
        : [];

    const partsByFindingId =
      new Map<string, any[]>();

    for (const part of parts) {
      const existing =
        partsByFindingId.get(
          part.finalBillFindingId,
        ) ?? [];

      existing.push(part);

      partsByFindingId.set(
        part.finalBillFindingId,
        existing,
      );
    }

    const findingsWithParts =
      findings.map(
        finding => ({
          ...finding,
          parts:
            partsByFindingId.get(
              finding.id,
            ) ?? [],
        }),
      );

    const data = {
      ...bill,
      findings:
        findingsWithParts,
      fees,
      discounts,
      workTasks,
    };

    return NextResponse.json(
      {
        error: false,
        message:
          'Final Cost retrieved.',
        data,
      },
      {
        status: 200,
      },
    );
  } catch (e) {
    console.error(
      '[GET /api/payments/final-bills/[id]] Error:',
      e,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Unable to fetch Final Cost.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      },
    );
  }
}
