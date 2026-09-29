import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { EstimateFindings } from '@/database/models/payments/estimate-findings.model';
import { EstimateFindingParts } from '@/database/models/payments/estimate-finding-parts.model';
import { eq, inArray } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';

// --------------------------------------------------------------------
// PATCH /api/payments/estimates/:id/findings/:findingId/toggle
// --------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> },
) {
  const { id: estimateId, findingId } = await params;

  if (!isValidUUID(estimateId) || !isValidUUID(findingId)) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid ID',
        errorMessage: 'Estimate ID and finding ID must be valid UUIDs.',
        errorLog: null,
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
        errorMessage: 'Request body must be valid JSON.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  if (typeof body?.included !== 'boolean') {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid finding selection',
        errorMessage: 'included must be a boolean.',
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    const result = await Database.transaction(async (tx) => {
      const [estimate] = await tx
        .select({
          id: EstimatedCosts.id,
          status: EstimatedCosts.status,
          serviceSubtotal: EstimatedCosts.serviceSubtotal,
          feesTotal: EstimatedCosts.feesTotal,
          discountTotal: EstimatedCosts.discountTotal,
        })
        .from(EstimatedCosts)
        .where(eq(EstimatedCosts.id, estimateId))
        .limit(1);

      if (!estimate) {
        throw Object.assign(new Error('Estimate does not exist.'), {
          status: 404,
          errorType: 'auth',
          errorTitle: 'Estimate not found',
        });
      }

      if (estimate.status !== 'WAITING_FOR_APPROVAL') {
        throw Object.assign(
          new Error('Findings can only be edited while the estimate is waiting for approval.'),
          { status: 422, errorType: 'fve', errorTitle: 'Invalid status' },
        );
      }

      const [finding] = await tx
        .select()
        .from(EstimateFindings)
        .where(
          eq(EstimateFindings.id, findingId),
        )
        .limit(1);

      if (!finding || finding.estimateId !== estimateId) {
        throw Object.assign(new Error('Finding does not belong to this estimate.'), {
          status: 404,
          errorType: 'auth',
          errorTitle: 'Finding not found',
        });
      }

      await tx
        .update(EstimateFindings)
        .set({ included: body.included })
        .where(eq(EstimateFindings.id, findingId));

      const allFindings = await tx
        .select()
        .from(EstimateFindings)
        .where(eq(EstimateFindings.estimateId, estimateId));

      const includedIds = allFindings
        .filter((item) => item.included !== false)
        .map((item) => item.id);

      let findingsSubtotal = 0;

      if (includedIds.length > 0) {
        const parts = await tx
          .select()
          .from(EstimateFindingParts)
          .where(inArray(EstimateFindingParts.estimateFindingId, includedIds));

        findingsSubtotal = parts.reduce((sum, part) => {
          const quantity = Math.max(1, Number(part.quantity) || 1);
          const price = Math.max(0, Number(part.priceAtTime) || 0);
          return sum + quantity * price;
        }, 0);
      }

      const grandTotal =
        (Number(estimate.serviceSubtotal) || 0) +
        findingsSubtotal +
        (Number(estimate.feesTotal) || 0) -
        (Number(estimate.discountTotal) || 0);

      await tx
        .update(EstimatedCosts)
        .set({
          findingsSubtotal: findingsSubtotal.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(EstimatedCosts.id, estimateId));

      return {
        included,
        findingsSubtotal,
        grandTotal,
      };
    });

    return NextResponse.json(
      {
        error: false,
        message: result.included
          ? 'Finding included in estimate.'
          : 'Finding removed from estimate.',
        data: {
          included: result.included,
          findingsSubtotal: result.findingsSubtotal,
          grandTotal: result.grandTotal,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    const status = Number(error?.status) || 500;

    if (status < 500) {
      return NextResponse.json(
        {
          error: true,
          errorType: error?.errorType || 'fve',
          errorTitle: error?.errorTitle || 'Unable to update finding',
          errorMessage: error?.message || 'Unable to update finding.',
          errorLog: null,
        },
        { status },
      );
    }

    console.error(
      '[PATCH /api/payments/estimates/[id]/findings/[findingId]/toggle] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database update error',
        errorMessage: 'Could not update finding selection.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
