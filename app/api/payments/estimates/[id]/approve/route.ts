import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { Inventory } from "@/database/models/inventory/inventory.model";
import { InventoryAllocations } from "@/database/models/inventory/inventory-allocation.model";
import { eq, and, inArray, sql } from "drizzle-orm";
import { isValidUUID } from "@/utils/shared";
import { getAppointmentInfo } from "@/utils/payments/get-appointment-info";
import { paymentsTriggers } from "@/triggers/payments";
import { mobilePaymentsTriggers } from "@/app-triggers/payments";

// --------------------------------------------------------------------
// PATCH /api/payments/estimates/:id/approve
// --------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fve",
        errorTitle: "Invalid ID",
        errorMessage: "ID must be a valid UUID.",
        errorLog: null,
      },
      { status: 422 },
    );
  }

  let body: any = {};
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch (error) {
    return NextResponse.json(
      {
        error: true,
        errorType: "fe",
        errorTitle: "Invalid JSON",
        errorMessage: "Request body must contain valid JSON.",
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const includedFindingIds = Array.isArray(body?.includedFindingIds)
    ? body.includedFindingIds.filter(
        (value: unknown): value is string =>
          typeof value === 'string' && isValidUUID(value),
      )
    : null;

  try {
    const result = await Database.transaction(async (tx) => {
      const [estimate] = await tx
        .select()
        .from(EstimatedCosts)
        .where(eq(EstimatedCosts.id, id))
        .limit(1);

      if (!estimate) {
        throw Object.assign(
          new Error('Estimate does not exist.'),
          { status: 404, errorType: 'auth', errorTitle: 'Estimate not found' },
        );
      }

      if (estimate.status !== 'WAITING_FOR_APPROVAL') {
        throw Object.assign(
          new Error('Only estimates in WAITING_FOR_APPROVAL can be approved.'),
          { status: 422, errorType: 'fve', errorTitle: 'Invalid status' },
        );
      }

      const estimateFindings = await tx
        .select()
        .from(EstimateFindings)
        .where(eq(EstimateFindings.estimateId, id));

      const requestedIncluded =
        includedFindingIds === null
          ? null
          : new Set(includedFindingIds);

      const includedFindingRows = estimateFindings.filter((finding) => {
        if (requestedIncluded) {
          return requestedIncluded.has(finding.id);
        }

        return finding.included !== false;
      });

      // Apply the customer's final finding selection.
      if (requestedIncluded) {
        for (const finding of estimateFindings) {
          const included = requestedIncluded.has(finding.id);
          if (finding.included !== included) {
            await tx
              .update(EstimateFindings)
              .set({ included })
              .where(eq(EstimateFindings.id, finding.id));
          }
        }
      }

      // Recalculate finding subtotal from the estimate's persisted finding parts.
      let findingsSubtotal = 0;

      if (includedFindingRows.length > 0) {
        const includedIds = includedFindingRows.map((finding) => finding.id);
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

      const serviceSubtotal = Number(estimate.serviceSubtotal) || 0;
      const feesTotal = Number(estimate.feesTotal) || 0;
      const discountTotal = Number(estimate.discountTotal) || 0;
      const grandTotal =
        serviceSubtotal +
        findingsSubtotal +
        feesTotal -
        discountTotal;

      await tx
        .update(EstimatedCosts)
        .set({
          findingsSubtotal: findingsSubtotal.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(EstimatedCosts.id, id));

      // Restore ONLY the inventory allocations belonging to findings that
      // the customer removed. Remaining selected findings stay KEEP.
      const finalExcludedFindingIds = estimateFindings
        .filter((finding) =>
          requestedIncluded
            ? !requestedIncluded.has(finding.id)
            : finding.included === false,
        )
        .map((finding) => finding.findingId)
        .filter((value): value is string => Boolean(value));

      if (finalExcludedFindingIds.length > 0) {
        const keptAllocations = await tx
          .select({
            id: InventoryAllocations.id,
            inventoryItemId: InventoryAllocations.inventoryItemId,
            quantity: InventoryAllocations.quantity,
          })
          .from(InventoryAllocations)
          .where(
            and(
              eq(InventoryAllocations.appointmentId, estimate.appointmentId),
              eq(InventoryAllocations.status, 'KEEP'),
              inArray(
                InventoryAllocations.findingId,
                finalExcludedFindingIds,
              ),
            ),
          );

        const quantityByItem = new Map<string, number>();

        for (const allocation of keptAllocations) {
          if (!allocation.inventoryItemId) continue;
          quantityByItem.set(
            allocation.inventoryItemId,
            (quantityByItem.get(allocation.inventoryItemId) || 0) +
              Math.max(1, Number(allocation.quantity) || 1),
          );
        }

        for (const [inventoryItemId, quantity] of quantityByItem.entries()) {
          await tx
            .update(Inventory)
            .set({
              quantity: sql`${Inventory.quantity} + ${quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(Inventory.id, inventoryItemId));
        }

        if (keptAllocations.length > 0) {
          await tx
            .update(InventoryAllocations)
            .set({
              status: 'RESTORED',
              restoredAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              inArray(
                InventoryAllocations.id,
                keptAllocations.map((allocation) => allocation.id),
              ),
            );
        }
      }

      await tx
        .update(EstimatedCosts)
        .set({
          status: 'APPROVED',
          updatedAt: new Date(),
        })
        .where(eq(EstimatedCosts.id, id));

      await tx
        .update(Appointments)
        .set({
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        })
        .where(eq(Appointments.id, estimate.appointmentId));

      return {
        appointmentId: estimate.appointmentId,
        findingsSubtotal,
        grandTotal,
      };
    });

    const info = await getAppointmentInfo(result.appointmentId);

    mobilePaymentsTriggers
      .onEstimateApproved({
        customerId: info.customerId,
        trackingNumber: info.trackingNumber,
        appointmentId: result.appointmentId,
        estimateId: id,
      })
      .catch(console.error);

    paymentsTriggers
      .onEstimateApproved({
        trackingNumber: info.trackingNumber,
        customerName: info.customerName,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message: 'Estimate approved. Work can now begin.',
        data: {
          estimateId: id,
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
          errorTitle: error?.errorTitle || 'Unable to approve estimate',
          errorMessage: error?.message || 'Unable to approve estimate.',
          errorLog: null,
        },
        { status },
      );
    }

    console.error(
      '[PATCH /api/payments/estimates/[id]/approve] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database update error',
        errorMessage: 'Could not approve estimate.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
