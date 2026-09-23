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

/* ================================================================
   HELPERS
================================================================ */

function toNumber(
  value: unknown,
): number {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function roundMoney(
  value: number,
): number {
  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

function isValidQuantity(
  value: unknown,
): boolean {
  const parsed =
    Number(value);

  return (
    Number.isFinite(
      parsed,
    ) &&
    Number.isInteger(
      parsed,
    ) &&
    parsed > 0
  );
}

/* ================================================================
   PATCH
   Update a Final Bill finding part
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
    id: billId,
    findingId,
    partId,
  } = await params;

  /* ==============================================================
     VALIDATE IDS
  ============================================================== */

  if (
    !isValidUUID(
      billId,
    ) ||
    !isValidUUID(
      findingId,
    ) ||
    !isValidUUID(
      partId,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle:
          'Invalid IDs',
        errorMessage:
          'Bill ID, finding ID, and part ID must be valid UUIDs.',
        errorLog: null,
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     READ JSON BODY
  ============================================================== */

  let body: unknown;

  try {
    const raw =
      await req.text();

    if (!raw.trim()) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle:
            'Missing request body',
          errorMessage:
            'A request body is required.',
          errorLog: null,
        },
        {
          status: 400,
        },
      );
    }

    try {
      body =
        JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle:
            'Invalid JSON',
          errorMessage:
            'Request body must contain valid JSON.',
          errorLog: null,
        },
        {
          status: 400,
        },
      );
    }
  } catch (
    error
  ) {
    console.error(
      '[PATCH /api/payments/final-bills/[id]/findings/[findingId]/parts/[partId]] Request read error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'request',
        errorTitle:
          'Request error',
        errorMessage:
          'Unable to read request body.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }

  const requestBody =
    body &&
    typeof body === 'object'
      ? (body as Record<
          string,
          unknown
        >)
      : {};

  /* ==============================================================
     VALIDATE PROVIDED FIELDS
  ============================================================== */

  const hasQuantity =
    Object.prototype.hasOwnProperty.call(
      requestBody,
      'quantity',
    );

  const hasPriceAtTime =
    Object.prototype.hasOwnProperty.call(
      requestBody,
      'priceAtTime',
    );

  if (
    !hasQuantity &&
    !hasPriceAtTime
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle:
          'No changes supplied',
        errorMessage:
          'Provide quantity and/or priceAtTime.',
        errorLog: null,
      },
      {
        status: 422,
      },
    );
  }

  let requestedQuantity:
    | number
    | undefined;

  let requestedPrice:
    | number
    | undefined;

  if (
    hasQuantity
  ) {
    if (
      !isValidQuantity(
        requestBody.quantity,
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle:
            'Invalid quantity',
          errorMessage:
            'Quantity must be a positive whole number.',
          errorLog: null,
        },
        {
          status: 422,
        },
      );
    }

    requestedQuantity =
      Number(
        requestBody.quantity,
      );
  }

  if (
    hasPriceAtTime
  ) {
    const parsedPrice =
      Number(
        requestBody.priceAtTime,
      );

    if (
      !Number.isFinite(
        parsedPrice,
      ) ||
      parsedPrice < 0
    ) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle:
            'Invalid price',
          errorMessage:
            'priceAtTime must be a valid number greater than or equal to 0.',
          errorLog: null,
        },
        {
          status: 422,
        },
      );
    }

    requestedPrice =
      roundMoney(
        parsedPrice,
      );
  }

  /* ==============================================================
     DATABASE TRANSACTION
  ============================================================== */

  try {
    const result =
      await Database.transaction(
        async tx => {
          /* ======================================================
             FIND FINAL BILL
          ======================================================= */

          const [
            bill,
          ] =
            await tx
              .select()
              .from(
                FinalBill,
              )
              .where(
                eq(
                  FinalBill.id,
                  billId,
                ),
              )
              .limit(1);

          if (!bill) {
            throw new Error(
              'FINAL_BILL_NOT_FOUND',
            );
          }

          /* ======================================================
             ONLY PENDING BILLS MAY BE EDITED
          ======================================================= */

          if (
            bill.status !==
            'PENDING'
          ) {
            throw new Error(
              'FINAL_BILL_NOT_PENDING',
            );
          }

          /* ======================================================
             FIND FINAL BILL FINDING
          ======================================================= */

          const [
            finding,
          ] =
            await tx
              .select()
              .from(
                FinalBillFindings,
              )
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
              .limit(1);

          if (!finding) {
            throw new Error(
              'FINAL_BILL_FINDING_NOT_FOUND',
            );
          }

          /* ======================================================
             FIND PART
          ======================================================= */

          const [
            currentPart,
          ] =
            await tx
              .select()
              .from(
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
              )
              .limit(1);

          if (!currentPart) {
            throw new Error(
              'FINAL_BILL_FINDING_PART_NOT_FOUND',
            );
          }

          /* ======================================================
             RESOLVE NEW VALUES
          ======================================================= */

          /*
           * IMPORTANT:
           *
           * Keep the nullish-coalescing operation explicitly
           * grouped before using the logical OR fallback.
           *
           * This avoids the TypeScript syntax error:
           *
           * "Nullish coalescing operator requires parens when
           *  mixing with logical operators."
           *
           * Priority:
           *
           * 1. Requested quantity
           * 2. Existing quantity
           * 3. Quantity 1 as final fallback
           */
          const nextQuantity =
            requestedQuantity ??
            (
              toNumber(
                currentPart.quantity,
              ) || 1
            );

          const nextPrice =
            requestedPrice ??
            toNumber(
              currentPart.priceAtTime,
            );

          /*
           * Quantity is already validated above.
           *
           * Recalculate the line total from the final values rather
           * than trusting a client-supplied totalPrice.
           */
          const nextTotalPrice =
            roundMoney(
              nextQuantity *
                nextPrice,
            );

          /* ======================================================
             UPDATE PART
          ======================================================= */

          const [
            updatedPart,
          ] =
            await tx
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
                  nextTotalPrice.toFixed(
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

          if (!updatedPart) {
            throw new Error(
              'PART_UPDATE_FAILED',
            );
          }

          /* ======================================================
             RECALCULATE FINDING SUBTOTAL
          ======================================================= */

          const findingParts =
            await tx
              .select()
              .from(
                FinalBillFindingParts,
              )
              .where(
                eq(
                  FinalBillFindingParts.finalBillFindingId,
                  findingId,
                ),
              );

          const recalculatedFindingSubtotal =
            roundMoney(
              findingParts.reduce(
                (
                  sum,
                  part,
                ) =>
                  sum +
                  (
                    toNumber(
                      part.totalPrice,
                    ) ||
                    roundMoney(
                      (
                        toNumber(
                          part.quantity,
                        ) || 1
                      ) *
                        toNumber(
                          part.priceAtTime,
                        ),
                    )
                  ),
                0,
              ),
            );

          /* ======================================================
             UPDATE FINDING SUBTOTAL
          ======================================================= */

          const [
            updatedFinding,
          ] =
            await tx
              .update(
                FinalBillFindings,
              )
              .set({
                partsSubtotal:
                  recalculatedFindingSubtotal.toFixed(
                    2,
                  ),
              })
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
              .returning();

          if (!updatedFinding) {
            throw new Error(
              'FINDING_UPDATE_FAILED',
            );
          }

          /* ======================================================
             RECALCULATE ALL FINAL BILL FINDINGS
          ======================================================= */

          const allFindings =
            await tx
              .select()
              .from(
                FinalBillFindings,
              )
              .where(
                eq(
                  FinalBillFindings.finalBillId,
                  billId,
                ),
              );

          const findingsSubtotal =
            roundMoney(
              allFindings.reduce(
                (
                  sum,
                  billFinding,
                ) => {
                  /*
                   * Included findings contribute to the bill.
                   * Excluded findings remain visible but do not
                   * contribute to the amount.
                   */
                  if (
                    billFinding.included ===
                    false
                  ) {
                    return sum;
                  }

                  return (
                    sum +
                    toNumber(
                      billFinding.partsSubtotal,
                    )
                  );
                },
                0,
              ),
            );

          /* ======================================================
             RECALCULATE FINAL GRAND TOTAL
          ======================================================= */

          const serviceSubtotal =
            toNumber(
              bill.serviceSubtotal,
            );

          const workTasksSubtotal =
            toNumber(
              bill.workTasksSubtotal,
            );

          const feesTotal =
            toNumber(
              bill.feesTotal,
            );

          const discountTotal =
            toNumber(
              bill.discountTotal,
            );

          const grandTotal =
            roundMoney(
              serviceSubtotal +
                findingsSubtotal +
                workTasksSubtotal +
                feesTotal -
                discountTotal,
            );

          /* ======================================================
             UPDATE FINAL BILL TOTALS
          ======================================================= */

          const [
            updatedBill,
          ] =
            await tx
              .update(
                FinalBill,
              )
              .set({
                findingsSubtotal:
                  findingsSubtotal.toFixed(
                    2,
                  ),

                grandTotal:
                  grandTotal.toFixed(
                    2,
                  ),

                updatedAt:
                  new Date(),
              })
              .where(
                and(
                  eq(
                    FinalBill.id,
                    billId,
                  ),
                  eq(
                    FinalBill.status,
                    'PENDING',
                  ),
                ),
              )
              .returning();

          if (!updatedBill) {
            throw new Error(
              'FINAL_BILL_UPDATE_FAILED',
            );
          }

          return {
            bill:
              updatedBill,

            finding:
              updatedFinding,

            part:
              updatedPart,

            findingsSubtotal,

            grandTotal,
          };
        },
      );

    /* ==============================================================
       SUCCESS RESPONSE
    ============================================================== */

    return NextResponse.json(
      {
        error: false,

        message:
          'Final Cost finding part updated successfully.',

        data: {
          bill:
            result.bill,

          finding:
            result.finding,

          part:
            result.part,

          findingsSubtotal:
            result.findingsSubtotal,

          grandTotal:
            result.grandTotal,
        },
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    /* ==============================================================
       EXPECTED APPLICATION ERRORS
    ============================================================== */

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        'FINAL_BILL_NOT_FOUND'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'auth',
            errorTitle:
              'Final Cost not found',
            errorMessage:
              'Final Cost does not exist.',
            errorLog: null,
          },
          {
            status: 404,
          },
        );
      }

      if (
        error.message ===
        'FINAL_BILL_NOT_PENDING'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'fve',
            errorTitle:
              'Invalid Final Cost status',
            errorMessage:
              'Only PENDING Final Costs can be edited.',
            errorLog: null,
          },
          {
            status: 422,
          },
        );
      }

      if (
        error.message ===
        'FINAL_BILL_FINDING_NOT_FOUND'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'auth',
            errorTitle:
              'Finding not found',
            errorMessage:
              'The specified finding does not belong to this Final Cost.',
            errorLog: null,
          },
          {
            status: 404,
          },
        );
      }

      if (
        error.message ===
        'FINAL_BILL_FINDING_PART_NOT_FOUND'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'auth',
            errorTitle:
              'Part not found',
            errorMessage:
              'The specified part does not belong to this finding.',
            errorLog: null,
          },
          {
            status: 404,
          },
        );
      }

      if (
        error.message ===
        'PART_UPDATE_FAILED'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'dbe',
            errorTitle:
              'Part update failed',
            errorMessage:
              'Could not update the Final Cost finding part.',
            errorLog: null,
          },
          {
            status: 500,
          },
        );
      }

      if (
        error.message ===
        'FINDING_UPDATE_FAILED'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'dbe',
            errorTitle:
              'Finding update failed',
            errorMessage:
              'Could not update the finding subtotal.',
            errorLog: null,
          },
          {
            status: 500,
          },
        );
      }

      if (
        error.message ===
        'FINAL_BILL_UPDATE_FAILED'
      ) {
        return NextResponse.json(
          {
            error: true,
            errorType: 'dbe',
            errorTitle:
              'Final Cost update failed',
            errorMessage:
              'Could not recalculate the Final Cost.',
            errorLog: null,
          },
          {
            status: 500,
          },
        );
      }
    }

    /* ==============================================================
       DATABASE / UNEXPECTED ERROR
    ============================================================== */

    console.error(
      '[PATCH /api/payments/final-bills/[id]/findings/[findingId]/parts/[partId]] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database update error',
        errorMessage:
          'Could not update Final Cost finding part.',
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