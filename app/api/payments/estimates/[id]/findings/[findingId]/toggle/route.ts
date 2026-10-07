import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { Database } from '@/lib/drizzle';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { EstimateFindings } from '@/database/models/payments/estimate-findings.model';
import { EstimateFindingParts } from '@/database/models/payments/estimate-finding-parts.model';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { InventoryAllocations } from '@/database/models/inventory/inventory-allocation.model';
import { InspectionFindingParts } from '@/database/models/service-tracking/inspection-finding-parts.model';
import { isValidUUID } from '@/utils/shared';

/**
 * PATCH /api/payments/estimates/[id]/findings/[findingId]/toggle
 *
 * Changes the inclusion state of one estimate finding while the estimate
 * is WAITING_FOR_APPROVAL.
 *
 * When a finding is excluded:
 *   - its KEEP inventory allocations are restored to inventory
 *   - those allocations become RESTORED
 *   - the estimate subtotal is recalculated
 *
 * When a finding is included again:
 *   - inventory-linked finding parts are reserved again
 *   - new KEEP allocations are created
 *   - the estimate subtotal is recalculated
 *
 * Everything is performed inside one database transaction so a stock
 * failure rolls back the inclusion change as well.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> },
) {
  const { id: estimateId, findingId: estimateFindingId } = await params;

  if (!isValidUUID(estimateId) || !isValidUUID(estimateFindingId)) {
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

  const included = body?.included;

  if (typeof included !== 'boolean') {
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
          appointmentId: EstimatedCosts.appointmentId,
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
          new Error(
            'Findings can only be edited while the estimate is waiting for approval.',
          ),
          {
            status: 422,
            errorType: 'fve',
            errorTitle: 'Invalid status',
          },
        );
      }

      const [finding] = await tx
        .select({
          id: EstimateFindings.id,
          estimateId: EstimateFindings.estimateId,
          inspectionFindingId: EstimateFindings.findingId,
          included: EstimateFindings.included,
          description: EstimateFindings.description,
          partsSubtotal: EstimateFindings.partsSubtotal,
        })
        .from(EstimateFindings)
        .where(eq(EstimateFindings.id, estimateFindingId))
        .limit(1);

      if (!finding || finding.estimateId !== estimateId) {
        throw Object.assign(
          new Error('Finding does not belong to this estimate.'),
          {
            status: 404,
            errorType: 'auth',
            errorTitle: 'Finding not found',
          },
        );
      }

      const previousIncluded = finding.included !== false;

      // No state change: return the current calculation without creating
      // duplicate inventory allocations.
      if (previousIncluded === included) {
        const allFindings = await tx
          .select({
            id: EstimateFindings.id,
            included: EstimateFindings.included,
          })
          .from(EstimateFindings)
          .where(eq(EstimateFindings.estimateId, estimateId));

        const includedIds = allFindings
          .filter((item) => item.included !== false)
          .map((item) => item.id);

        let findingsSubtotal = 0;

        if (includedIds.length > 0) {
          const parts = await tx
            .select({
              quantity: EstimateFindingParts.quantity,
              priceAtTime: EstimateFindingParts.priceAtTime,
            })
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

        return {
          included,
          findingsSubtotal,
          grandTotal,
          restored: 0,
          reserved: 0,
        };
      }

      if (!included) {
        /* ----------------------------------------------------------
           EXCLUDE FINDING → RESTORE KEEP INVENTORY
        ---------------------------------------------------------- */
        const keptAllocations = await tx
          .select({
            id: InventoryAllocations.id,
            inventoryItemId: InventoryAllocations.inventoryItemId,
            quantity: InventoryAllocations.quantity,
          })
          .from(InventoryAllocations)
          .where(
            and(
              eq(InventoryAllocations.findingId, finding.inspectionFindingId),
              eq(InventoryAllocations.appointmentId, estimate.appointmentId),
              eq(InventoryAllocations.status, 'KEEP'),
            ),
          );

        const quantityByItem = new Map<string, number>();

        for (const allocation of keptAllocations) {
          if (!allocation.inventoryItemId) continue;

          const quantity = Math.max(1, Number(allocation.quantity) || 1);
          quantityByItem.set(
            allocation.inventoryItemId,
            (quantityByItem.get(allocation.inventoryItemId) || 0) + quantity,
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
              and(
                eq(InventoryAllocations.appointmentId, estimate.appointmentId),
                eq(InventoryAllocations.findingId, finding.inspectionFindingId),
                eq(InventoryAllocations.status, 'KEEP'),
              ),
            );
        }
      } else {
        /* ----------------------------------------------------------
           INCLUDE FINDING AGAIN → RESERVE INVENTORY AGAIN
        ---------------------------------------------------------- */
        const findingParts = await tx
          .select({
            id: InspectionFindingParts.id,
            inventoryItemId: InspectionFindingParts.inventoryItemId,
            quantity: InspectionFindingParts.quantity,
            priceAtTime: InspectionFindingParts.priceAtTime,
            partName: InspectionFindingParts.partName,
            itemName: Inventory.name,
            unit: Inventory.unit,
          })
          .from(InspectionFindingParts)
          .leftJoin(
            Inventory,
            eq(InspectionFindingParts.inventoryItemId, Inventory.id),
          )
          .where(eq(InspectionFindingParts.findingId, finding.inspectionFindingId));

        const linkedParts = findingParts.filter((part) => Boolean(part.inventoryItemId));

        const missingInventory = linkedParts.find((part) => !part.itemName);

        if (missingInventory) {
          throw Object.assign(
            new Error(
              `Inventory item for finding "${finding.description}" no longer exists.`,
            ),
            {
              status: 422,
              errorType: 'fve',
              errorTitle: 'Inventory item not found',
            },
          );
        }

        const activeKeepForFinding = await tx
          .select({ id: InventoryAllocations.id })
          .from(InventoryAllocations)
          .where(
            and(
              eq(InventoryAllocations.appointmentId, estimate.appointmentId),
              eq(InventoryAllocations.findingId, finding.inspectionFindingId),
              eq(InventoryAllocations.status, 'KEEP'),
            ),
          )
          .limit(1);

        if (activeKeepForFinding.length === 0) {
          const requestedByItem = new Map<string, number>();

          for (const part of linkedParts) {
            const quantity = Math.max(1, Number(part.quantity) || 1);
            const itemId = part.inventoryItemId as string;

            requestedByItem.set(
              itemId,
              (requestedByItem.get(itemId) || 0) + quantity,
            );
          }

          for (const [inventoryItemId, quantity] of requestedByItem.entries()) {
            const [updatedInventory] = await tx
              .update(Inventory)
              .set({
                quantity: sql`${Inventory.quantity} - ${quantity}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(Inventory.id, inventoryItemId),
                  sql`${Inventory.quantity} >= ${quantity}`,
                ),
              )
              .returning({
                id: Inventory.id,
                name: Inventory.name,
                quantity: Inventory.quantity,
                unit: Inventory.unit,
              });

            if (!updatedInventory) {
              const [currentInventory] = await tx
                .select({
                  id: Inventory.id,
                  name: Inventory.name,
                  quantity: Inventory.quantity,
                  unit: Inventory.unit,
                })
                .from(Inventory)
                .where(eq(Inventory.id, inventoryItemId))
                .limit(1);

              const available = Number(currentInventory?.quantity ?? 0);
              const itemName = currentInventory?.name || 'Selected inventory item';
              const unit = currentInventory?.unit || 'unit';

              throw Object.assign(
                new Error(
                  `"${itemName}" has only ${available} ${unit} available, but ${quantity} ${unit} is required.`,
                ),
                {
                  status: 422,
                  errorType: 'fve',
                  errorTitle: 'Insufficient inventory',
                },
              );
            }
          }

          const now = new Date();

          for (const part of linkedParts) {
            await tx.insert(InventoryAllocations).values({
              appointmentId: estimate.appointmentId,
              findingId: finding.inspectionFindingId,
              findingPartId: part.id,
              inventoryItemId: part.inventoryItemId as string,
              itemName: part.itemName as string,
              unit: part.unit || null,
              quantity: Math.max(1, Number(part.quantity) || 1),
              priceAtTime: String(Number(part.priceAtTime) || 0),
              status: 'KEEP',
              keptAt: now,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      await tx
        .update(EstimateFindings)
        .set({
          included,
        })
        .where(eq(EstimateFindings.id, estimateFindingId));

      const allFindings = await tx
        .select({
          id: EstimateFindings.id,
          included: EstimateFindings.included,
        })
        .from(EstimateFindings)
        .where(eq(EstimateFindings.estimateId, estimateId));

      const includedIds = allFindings
        .filter((item) => item.included !== false)
        .map((item) => item.id);

      let findingsSubtotal = 0;

      if (includedIds.length > 0) {
        const parts = await tx
          .select({
            quantity: EstimateFindingParts.quantity,
            priceAtTime: EstimateFindingParts.priceAtTime,
          })
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
        appointmentId: estimate.appointmentId,
      };
    });

    await recordPaymentTransaction({
      entityType: 'ESTIMATE',
      entityId: estimateId,
      appointmentId: result.appointmentId,
      eventType: result.included ? 'FINDING_INCLUDED' : 'FINDING_EXCLUDED',
      amount: result.grandTotal,
      details: { findingId: estimateFindingId, included: result.included, findingsSubtotal: result.findingsSubtotal },
    });

    return NextResponse.json(
      {
        error: false,
        message: result.included
          ? 'Finding included in estimate.'
          : 'Finding removed from estimate and its kept inventory was restored.',
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
    const message = error instanceof Error ? error.message : String(error);

    if (status < 500) {
      return NextResponse.json(
        {
          error: true,
          errorType: error?.errorType || 'fve',
          errorTitle: error?.errorTitle || 'Unable to update finding',
          errorMessage: message,
          errorLog: null,
        },
        { status },
      );
    }

    console.error(
      '[PATCH /api/payments/estimates/[id]/findings/[findingId]/toggle] Database error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database update error',
        errorMessage: message || 'Could not update finding selection.',
        errorLog: message,
      },
      { status: 500 },
    );
  }
}
