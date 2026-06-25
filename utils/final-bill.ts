import { Database } from "@/lib/drizzle";
import { FinalBill } from "@/database/models/billing/final-bill.model";
import { FinalBillFindings } from "@/database/models/billing/final-bill-findings.model";
import { FinalBillFindingParts } from "@/database/models/billing/final-bill-finding-parts.model";
import { FinalBillFees } from "@/database/models/billing/final-bill-fees.model";
import { FinalBillDiscounts } from "@/database/models/billing/final-bill-discounts.model";
import { FinalBillWorkTasks } from "@/database/models/billing/final-bill-work-tasks.model";
import { EstimatedCosts } from "@/database/models/billing/estimated-costs.model";
import { EstimateFindings } from "@/database/models/billing/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/billing/estimate-finding-parts.model";
import { EstimateFees } from "@/database/models/billing/estimate-fees.model";
import { EstimateDiscounts } from "@/database/models/billing/estimate-discounts.model";
import { WorkTasks } from "@/database/models/service-tracking/work-tasks.model";
import { eq, and } from "drizzle-orm";

export async function generateFinalBill(appointmentId: string, estimateId: string) {
  // 1. Get the approved estimate
  const [estimate] = await Database.select()
    .from(EstimatedCosts)
    .where(
      and(
        eq(EstimatedCosts.id, estimateId),
        eq(EstimatedCosts.status, 'APPROVED')
      )
    );
  if (!estimate) {
    throw new Error("Approved estimate not found.");
  }

  // 2. Get completed work tasks for this appointment (status = DONE)
  const workTasks = await Database.select()
    .from(WorkTasks)
    .where(
      and(
        eq(WorkTasks.appointmentId, appointmentId),
        eq(WorkTasks.status, 'DONE')
      )
    );

  // 3. Create FinalBill
  const [finalBill] = await Database.insert(FinalBill)
    .values({
      appointmentId,
      estimateId: estimate.id,
      status: 'PENDING',
      serviceSubtotal: estimate.serviceSubtotal,
      findingsSubtotal: '0',
      workTasksSubtotal: '0',
      feesTotal: '0',
      discountTotal: '0',
      grandTotal: '0',
    })
    .returning();

  // 4. Copy Estimate Findings (only included ones)
  const estimateFindings = await Database.select()
    .from(EstimateFindings)
    .where(
      and(
        eq(EstimateFindings.estimateId, estimateId),
        eq(EstimateFindings.included, true)
      )
    );

  let findingsSubtotal = 0;
  for (const ef of estimateFindings) {
    const [fbFinding] = await Database.insert(FinalBillFindings)
      .values({
        finalBillId: finalBill.id,
        findingId: ef.findingId,
        description: ef.description,
        included: true,
        partsSubtotal: ef.partsSubtotal,
      })
      .returning();

    // Copy parts
    const parts = await Database.select()
      .from(EstimateFindingParts)
      .where(eq(EstimateFindingParts.estimateFindingId, ef.id));
    for (const p of parts) {
      await Database.insert(FinalBillFindingParts)
        .values({
          finalBillFindingId: fbFinding.id,
          partName: p.partName,
          quantity: p.quantity,
          priceAtTime: p.priceAtTime,
          isPms: p.isPms,
          totalPrice: p.totalPrice,
        });
    }
    findingsSubtotal += parseFloat(ef.partsSubtotal);
  }

  // 5. Copy Fees
  const fees = await Database.select()
    .from(EstimateFees)
    .where(eq(EstimateFees.estimateId, estimateId));
  let feesTotal = 0;
  for (const f of fees) {
    await Database.insert(FinalBillFees)
      .values({
        finalBillId: finalBill.id,
        findingId: f.findingId,
        title: f.title,
        amount: f.amount,
      });
    feesTotal += parseFloat(f.amount);
  }

  // 6. Copy Discounts
  const discounts = await Database.select()
    .from(EstimateDiscounts)
    .where(eq(EstimateDiscounts.estimateId, estimateId));
  // We'll copy them, but amounts will be recalculated later.
  for (const d of discounts) {
    await Database.insert(FinalBillDiscounts)
      .values({
        finalBillId: finalBill.id,
        title: d.title,
        type: d.type,
        value: d.value,
        amount: '0',
      });
  }

  // 7. Copy Work Tasks (completed)
  let workTasksSubtotal = 0;
  // We don't have a price for work tasks; they are just a list of completed tasks.
  // But we might charge for labor? For now, we'll just store them as items without a price.
  for (const wt of workTasks) {
    await Database.insert(FinalBillWorkTasks)
      .values({
        finalBillId: finalBill.id,
        workTaskId: wt.id,
        title: wt.title,
        order: wt.order,
      });
  }
  // Work tasks subtotal could be a separate line item – we'll keep it as 0 for now.

  // 8. Compute totals
  const serviceSubtotal = parseFloat(estimate.serviceSubtotal);
  const totalBeforeDiscount = serviceSubtotal + findingsSubtotal + feesTotal + workTasksSubtotal;

  // Recalculate discounts based on totalBeforeDiscount
  let totalDiscount = 0;
  const savedDiscounts = await Database.select()
    .from(FinalBillDiscounts)
    .where(eq(FinalBillDiscounts.finalBillId, finalBill.id));
  for (const d of savedDiscounts) {
    let amount = 0;
    if (d.type === 'fixed') {
      amount = parseFloat(d.value);
    } else {
      amount = totalBeforeDiscount * (parseFloat(d.value) / 100);
    }
    totalDiscount += amount;
    // Update the discount record with computed amount
    await Database.update(FinalBillDiscounts)
      .set({ amount: amount.toString() })
      .where(eq(FinalBillDiscounts.id, d.id));
  }

  const grandTotal = totalBeforeDiscount - totalDiscount;

  // Update FinalBill with totals
  await Database.update(FinalBill)
    .set({
      findingsSubtotal: findingsSubtotal.toString(),
      workTasksSubtotal: workTasksSubtotal.toString(),
      feesTotal: feesTotal.toString(),
      discountTotal: totalDiscount.toString(),
      grandTotal: grandTotal.toString(),
      updatedAt: new Date(),
    })
    .where(eq(FinalBill.id, finalBill.id));

  return finalBill;
}