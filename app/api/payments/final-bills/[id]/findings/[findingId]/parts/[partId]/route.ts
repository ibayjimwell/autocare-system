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
  eq,
  and,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  recalculateFinalBillTotals,
} from '@/utils/final-bill';

function editable(
  status: unknown,
) {
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

async function getPartContext(
  billId: string,
  findingId: string,
  partId: string,
) {
  const [
    bill,
    finding,
    part,
  ] = await Promise.all([
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
      .from(FinalBillFindings)
      .where(
        and(
          eq(
            FinalBillFindings.id,
            findingId,
          ),
          eq(
            FinalBillFindings.finalBillId,
            billId,
          ),
        ),
      )
      .limit(1),

    Database
      .select()
      .from(FinalBillFindingParts)
      .where(
        and(
          eq(
            FinalBillFindingParts.id,
            partId,
          ),
          eq(
            FinalBillFindingParts.finalBillFindingId,
            findingId,
          ),
        ),
      )
      .limit(1),
  ]);

  return {
    bill:
      bill[0] ?? null,

    finding:
      finding[0] ?? null,

    part:
      part[0] ?? null,
  };
}

/* ================================================================
   PATCH
   Update Final Cost finding part/item
================================================================ */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      findingId: string;
      partId: string;
    }>;
  },
) {
  const {
    id,
    findingId,
    partId,
  } = await params;

  /* ==============================================================
     VALIDATE IDS
  ============================================================== */

  if (
    !isValidUUID(id) ||
    !isValidUUID(findingId) ||
    !isValidUUID(partId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost, finding, or part ID.',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     PARSE REQUEST BODY
  ============================================================== */

  let body: any;

  try {
    body =
      await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Request body must be valid JSON.',
      },
      {
        status: 400,
      },
    );
  }

  /* ==============================================================
     QUANTITY
  ============================================================== */

  const quantity =
    body?.quantity ===
    undefined
      ? undefined
      : Number(
          body.quantity,
        );

  /* ==============================================================
     PRICE
  ============================================================== */

  const priceAtTime =
    body?.priceAtTime ===
    undefined
      ? undefined
      : Number(
          body.priceAtTime,
        );

  /* ==============================================================
     VALIDATE QUANTITY
  ============================================================== */

  if (
    quantity !==
      undefined &&
    (
      !Number.isFinite(
        quantity,
      ) ||
      quantity < 1 ||
      !Number.isInteger(
        quantity,
      )
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Quantity must be a whole number of at least 1.',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     VALIDATE PRICE
  ============================================================== */

  if (
    priceAtTime !==
      undefined &&
    (
      !Number.isFinite(
        priceAtTime,
      ) ||
      priceAtTime < 0
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Part price must be zero or greater.',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     REQUIRE AT LEAST ONE VALUE
  ============================================================== */

  if (
    quantity ===
      undefined &&
    priceAtTime ===
      undefined
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'At least one part value must be provided.',
      },
      {
        status: 422,
      },
    );
  }

  try {
    /* ============================================================
       GET BILL / FINDING / PART
    ============================================================ */

    const {
      bill,
      finding,
      part,
    } =
      await getPartContext(
        id,
        findingId,
        partId,
      );

    /* ============================================================
       BILL NOT FOUND
    ============================================================ */

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

    /* ============================================================
       FINDING NOT FOUND
    ============================================================ */

    if (!finding) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Finding does not belong to this Final Cost.',
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       PART NOT FOUND
    ============================================================ */

    if (!part) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Part/item not found for this finding.',
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       STATUS VALIDATION
    ============================================================ */

    if (
      !editable(
        bill.status,
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Parts/items can only be edited while the Final Cost is Pending or Parked.',
        },
        {
          status: 409,
        },
      );
    }

    /* ============================================================
       CALCULATE NEXT QUANTITY
    ============================================================ */

    /*
     * Parentheses are required here because JavaScript does not
     * allow mixing ?? and || directly.
     *
     * Previous invalid expression:
     *
     * quantity ?? Number(part.quantity) || 1
     *
     * Correct:
     *
     * quantity ?? (Number(part.quantity) || 1)
     */
    const nextQuantity =
      quantity ??
      (
        Number(
          part.quantity,
        ) || 1
      );

    /* ============================================================
       CALCULATE NEXT PRICE
    ============================================================ */

    /*
     * Parentheses are required for the same reason.
     *
     * Previous invalid expression:
     *
     * priceAtTime ?? Number(part.priceAtTime) || 0
     *
     * Correct:
     *
     * priceAtTime ?? (Number(part.priceAtTime) || 0)
     */
    const nextPrice =
      priceAtTime ??
      (
        Number(
          part.priceAtTime,
        ) || 0
      );

    /* ============================================================
       CALCULATE TOTAL
    ============================================================ */

    const totalPrice =
      nextQuantity *
      nextPrice;

    /* ============================================================
       UPDATE PART
    ============================================================ */

    const [
      updatedPart,
    ] =
      await Database
        .update(
          FinalBillFindingParts,
        )
        .set({
          quantity:
            nextQuantity,

          priceAtTime:
            nextPrice.toFixed(
              2,
            ),

          totalPrice:
            totalPrice.toFixed(
              2,
            ),
        })
        .where(
          and(
            eq(
              FinalBillFindingParts.id,
              partId,
            ),

            eq(
              FinalBillFindingParts.finalBillFindingId,
              findingId,
            ),
          ),
        )
        .returning();

    /* ============================================================
       RECALCULATE FINAL COST
    ============================================================ */

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    /* ============================================================
       RESPONSE
    ============================================================ */

    return NextResponse.json(
      {
        error: false,

        message:
          'Part/item updated.',

        data: {
          part:
            updatedPart,

          bill:
            updatedBill,
        },
      },
    );
  } catch (
    error,
  ) {
    console.error(
      '[PATCH /api/payments/final-bills/[id]/findings/[findingId]/parts/[partId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,

        errorMessage:
          'Failed to update Final Cost part/item.',
      },
      {
        status: 500,
      },
    );
  }
}

/* ================================================================
   DELETE
   Remove Final Cost finding part/item
================================================================ */

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      findingId: string;
      partId: string;
    }>;
  },
) {
  /*
   * Request body is not needed for DELETE, but keep the request
   * parameter because it is part of the Next.js route handler
   * signature.
   */
  void req;

  const {
    id,
    findingId,
    partId,
  } = await params;

  /* ==============================================================
     VALIDATE IDS
  ============================================================== */

  if (
    !isValidUUID(id) ||
    !isValidUUID(findingId) ||
    !isValidUUID(partId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid Final Cost, finding, or part ID.',
      },
      {
        status: 422,
      },
    );
  }

  try {
    /* ============================================================
       GET BILL / FINDING / PART
    ============================================================ */

    const {
      bill,
      finding,
      part,
    } =
      await getPartContext(
        id,
        findingId,
        partId,
      );

    /* ============================================================
       BILL NOT FOUND
    ============================================================ */

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

    /* ============================================================
       FINDING NOT FOUND
    ============================================================ */

    if (!finding) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Finding does not belong to this Final Cost.',
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       PART NOT FOUND
    ============================================================ */

    if (!part) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Part/item not found for this finding.',
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       STATUS VALIDATION
    ============================================================ */

    if (
      !editable(
        bill.status,
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Parts/items can only be removed while the Final Cost is Pending or Parked.',
        },
        {
          status: 409,
        },
      );
    }

    /* ============================================================
       DELETE PART
    ============================================================ */

    await Database
      .delete(
        FinalBillFindingParts,
      )
      .where(
        and(
          eq(
            FinalBillFindingParts.id,
            partId,
          ),

          eq(
            FinalBillFindingParts.finalBillFindingId,
            findingId,
          ),
        ),
      );

    /* ============================================================
       RECALCULATE FINAL COST
    ============================================================ */

    const updatedBill =
      await recalculateFinalBillTotals(
        id,
      );

    /* ============================================================
       RESPONSE
    ============================================================ */

    return NextResponse.json(
      {
        error: false,

        message:
          'Part/item removed.',

        data:
          updatedBill,
      },
    );
  } catch (
    error,
  ) {
    console.error(
      '[DELETE /api/payments/final-bills/[id]/findings/[findingId]/parts/[partId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,

        errorMessage:
          'Failed to remove Final Cost part/item.',
      },
      {
        status: 500,
      },
    );
  }
}