import {
  Database,
} from '@/lib/drizzle';

import {
  EstimatedCosts,
} from '@/database/models/payments/estimated-costs.model';

import {
  EstimateFindings,
} from '@/database/models/payments/estimate-findings.model';

import {
  EstimateFindingParts,
} from '@/database/models/payments/estimate-finding-parts.model';

import {
  EstimateFees,
} from '@/database/models/payments/estimate-fees.model';

import {
  EstimateDiscounts,
} from '@/database/models/payments/estimate-discounts.model';

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
  WorkTasks,
} from '@/database/models/service-tracking/work-tasks.model';

import {
  and,
  eq,
  inArray,
} from 'drizzle-orm';

/* ================================================================
   HELPERS
================================================================ */

function toNumber(
  value: unknown,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(
  value: number,
): string {
  return value.toFixed(2);
}

function partTotal(
  part: any,
): number {
  const storedTotal =
    toNumber(part?.totalPrice);

  if (storedTotal > 0) {
    return storedTotal;
  }

  const quantity = Math.max(
    1,
    toNumber(part?.quantity) || 1,
  );

  const price = Math.max(
    0,
    toNumber(
      part?.priceAtTime ??
        part?.price,
    ),
  );

  return quantity * price;
}

/* ================================================================
   RECALCULATE FINAL COST
================================================================ */

export async function recalculateFinalBillTotals(
  finalBillId: string,
) {
  const [bill] =
    await Database
      .select()
      .from(FinalBill)
      .where(
        eq(
          FinalBill.id,
          finalBillId,
        ),
      )
      .limit(1);

  if (!bill) {
    throw new Error(
      'Final Cost not found.',
    );
  }

  const [findings, fees, discounts] =
    await Promise.all([
      Database
        .select()
        .from(FinalBillFindings)
        .where(
          eq(
            FinalBillFindings.finalBillId,
            finalBillId,
          ),
        ),

      Database
        .select()
        .from(FinalBillFees)
        .where(
          eq(
            FinalBillFees.finalBillId,
            finalBillId,
          ),
        ),

      Database
        .select()
        .from(FinalBillDiscounts)
        .where(
          eq(
            FinalBillDiscounts.finalBillId,
            finalBillId,
          ),
        ),
    ]);

  let parts = [] as any[];

  if (findings.length > 0) {
    parts = await Database
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
      );
  }

  const partsByFinding =
    new Map<string, any[]>();

  for (const part of parts) {
    const existing =
      partsByFinding.get(
        part.finalBillFindingId,
      ) ?? [];

    existing.push(part);

    partsByFinding.set(
      part.finalBillFindingId,
      existing,
    );
  }

  let findingsSubtotal = 0;

  for (const finding of findings) {
    const findingParts =
      partsByFinding.get(
        finding.id,
      ) ?? [];

    const subtotal =
      findingParts.reduce(
        (
          total: number,
          part: any,
        ) =>
          total +
          partTotal(part),
        0,
      );

    await Database
      .update(FinalBillFindings)
      .set({
        partsSubtotal:
          money(subtotal),
      })
      .where(
        eq(
          FinalBillFindings.id,
          finding.id,
        ),
      );

    if (finding.included !== false) {
      findingsSubtotal += subtotal;
    }
  }

  const serviceSubtotal =
    toNumber(
      bill.serviceSubtotal,
    );

  const workTasksSubtotal =
    toNumber(
      bill.workTasksSubtotal,
    );

  const feesTotal =
    fees.reduce(
      (
        total: number,
        fee: any,
      ) =>
        total +
        Math.max(
          0,
          toNumber(fee.amount),
        ),
      0,
    );

  /*
   * All discounts are calculated against the current pre-discount
   * subtotal. Each discount row stores its own computed amount so the
   * detail modal and final totals stay synchronized.
   */
  const discountBase =
    serviceSubtotal +
    findingsSubtotal +
    workTasksSubtotal +
    feesTotal;

  let discountTotal = 0;

  for (const discount of discounts) {
    const value =
      Math.max(
        0,
        toNumber(discount.value),
      );

    const amount =
      String(
        discount.type || '',
      ).toLowerCase() ===
      'percentage'
        ? discountBase * (value / 100)
        : value;

    const safeAmount = Math.min(
      Math.max(0, amount),
      Math.max(0, discountBase),
    );

    discountTotal += safeAmount;

    await Database
      .update(FinalBillDiscounts)
      .set({
        amount:
          money(safeAmount),
        updatedAt:
          new Date(),
      })
      .where(
        eq(
          FinalBillDiscounts.id,
          discount.id,
        ),
      );
  }

  const grandTotal =
    Math.max(
      0,
      discountBase -
        discountTotal,
    );

  const [updatedBill] =
    await Database
      .update(FinalBill)
      .set({
        findingsSubtotal:
          money(findingsSubtotal),
        feesTotal:
          money(feesTotal),
        discountTotal:
          money(discountTotal),
        grandTotal:
          money(grandTotal),
        updatedAt:
          new Date(),
      })
      .where(
        eq(
          FinalBill.id,
          finalBillId,
        ),
      )
      .returning();

  return updatedBill;
}

/* ================================================================
   GENERATE FINAL COST FROM APPROVED ESTIMATE
================================================================ */

export async function generateFinalBill(
  appointmentId: string,
  estimateId: string,
) {
  const [estimate] =
    await Database
      .select()
      .from(EstimatedCosts)
      .where(
        and(
          eq(
            EstimatedCosts.id,
            estimateId,
          ),
          eq(
            EstimatedCosts.appointmentId,
            appointmentId,
          ),
          eq(
            EstimatedCosts.status,
            'APPROVED',
          ),
        ),
      )
      .limit(1);

  if (!estimate) {
    throw new Error(
      'Approved estimate not found for this appointment.',
    );
  }

  /*
   * Avoid creating duplicate Final Costs for the same approved
   * estimate when the completion action is accidentally submitted
   * more than once.
   */
  const [existingBill] =
    await Database
      .select()
      .from(FinalBill)
      .where(
        and(
          eq(
            FinalBill.appointmentId,
            appointmentId,
          ),
          eq(
            FinalBill.estimateId,
            estimateId,
          ),
        ),
      )
      .limit(1);

  if (existingBill) {
    return existingBill;
  }

  /* ==============================================================
     LOAD ESTIMATE DETAIL
  ============================================================== */

  const [
    estimateFindings,
    estimateFees,
    estimateDiscounts,
  ] = await Promise.all([
    Database
      .select()
      .from(EstimateFindings)
      .where(
        eq(
          EstimateFindings.estimateId,
          estimateId,
        ),
      ),

    Database
      .select()
      .from(EstimateFees)
      .where(
        eq(
          EstimateFees.estimateId,
          estimateId,
        ),
      ),

    Database
      .select()
      .from(EstimateDiscounts)
      .where(
        eq(
          EstimateDiscounts.estimateId,
          estimateId,
        ),
      ),  ]);

  let estimateParts = [] as any[];

  if (estimateFindings.length > 0) {
    estimateParts =
      await Database
        .select()
        .from(EstimateFindingParts)
        .where(
          inArray(
            EstimateFindingParts.estimateFindingId,
            estimateFindings.map(
              finding =>
                finding.id,
            ),
          ),
        );
  }

  const partsByEstimateFinding =
    new Map<string, any[]>();

  for (const part of estimateParts) {
    const existing =
      partsByEstimateFinding.get(
        part.estimateFindingId,
      ) ?? [];

    existing.push(part);

    partsByEstimateFinding.set(
      part.estimateFindingId,
      existing,
    );
  }

  /* ==============================================================
     CREATE FINAL COST PARENT
  ============================================================== */

  const [newBill] =
    await Database
      .insert(FinalBill)
      .values({
        appointmentId,
        estimateId,
        status: 'PENDING',
        serviceSubtotal:
          String(
            estimate.serviceSubtotal ??
              '0',
          ),
        findingsSubtotal:
          String(
            estimate.findingsSubtotal ??
              '0',
          ),
        workTasksSubtotal: '0',
        feesTotal:
          String(
            estimate.feesTotal ??
              '0',
          ),
        discountTotal:
          String(
            estimate.discountTotal ??
              '0',
          ),
        grandTotal:
          String(
            estimate.grandTotal ??
              '0',
          ),
        notes:
          estimate.reason ??
          null,
      })
      .returning();

  if (!newBill) {
    throw new Error(
      'Failed to create Final Cost.',
    );
  }

  /* ==============================================================
     SNAPSHOT FINDINGS + PARTS
  ============================================================== */

  for (const finding of estimateFindings) {
    const [newFinding] =
      await Database
        .insert(FinalBillFindings)
        .values({
          finalBillId:
            newBill.id,
          findingId:
            finding.findingId,
          description:
            finding.description,
          included:
            finding.included,
          partsSubtotal:
            String(
              finding.partsSubtotal ??
                '0',
            ),
        })
        .returning();

    if (!newFinding) {
      throw new Error(
        `Failed to copy finding ${finding.id} into the Final Cost.`,
      );
    }

    const findingParts =
      partsByEstimateFinding.get(
        finding.id,
      ) ?? [];

    if (findingParts.length > 0) {
      await Database
        .insert(FinalBillFindingParts)
        .values(
          findingParts.map(
            (part: any) => ({
              finalBillFindingId:
                newFinding.id,
              partName:
                part.partName,
              quantity:
                Math.max(
                  1,
                  toNumber(
                    part.quantity,
                  ) || 1,
                ),
              priceAtTime:
                String(
                  part.priceAtTime ??
                    '0',
                ),
              isPms:
                part.isPms === true,
              totalPrice:
                String(
                  part.totalPrice ??
                    partTotal(part),
                ),
            }),
          ),
        );
    }
  }

  /* ==============================================================
     SNAPSHOT FEES
  ============================================================== */

  if (estimateFees.length > 0) {
    await Database
      .insert(FinalBillFees)
      .values(
        estimateFees.map(
          (fee: any) => ({
            finalBillId:
              newBill.id,
            findingId:
              fee.findingId ??
              null,
            title:
              fee.title,
            amount:
              String(
                fee.amount ?? '0',
              ),
        })),
      );
  }

  /* ==============================================================
     SNAPSHOT DISCOUNTS
  ============================================================== */

  if (estimateDiscounts.length > 0) {
    await Database
      .insert(FinalBillDiscounts)
      .values(
        estimateDiscounts.map(
          (discount: any) => ({
            finalBillId:
              newBill.id,
            title:
              discount.title,
            type:
              discount.type,
            value:
              String(
                discount.value ??
                  '0',
              ),
            amount:
              String(
                discount.amount ??
                  '0',
              ),
          })),
      );
  }

  /* ==============================================================
     SNAPSHOT COMPLETED WORK TASKS

     FinalBillWorkTasks.workTaskId references the service-tracking
     WorkTasks table, so use the actual completed WorkTasks here
     instead of EstimateTasks (which represents inspection tasks).
  ============================================================== */

  const completedWorkTasks =
    await Database
      .select()
      .from(WorkTasks)
      .where(
        and(
          eq(
            WorkTasks.appointmentId,
            appointmentId,
          ),
          eq(
            WorkTasks.status,
            'DONE',
          ),
        ),
      );

  if (completedWorkTasks.length > 0) {
    await Database
      .insert(FinalBillWorkTasks)
      .values(
        completedWorkTasks.map(
          (task: any, index: number) => ({
            finalBillId:
              newBill.id,
            workTaskId:
              task.id,
            title:
              task.title ||
              'Completed Task',
            order: index,
          })),
      );
  }

  /*
   * Recalculate from the newly-created snapshot so the Final Cost
   * remains internally consistent even when source values are strings
   * or a legacy estimate contains stale subtotal values.
   */
  const finalBill =
    await recalculateFinalBillTotals(
      newBill.id,
    );

  return finalBill;
}
