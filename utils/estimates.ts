import { Database } from "@/lib/drizzle";
import { EstimatedCosts } from "@/database/models/payments/estimated-costs.model";
import { EstimateFindings } from "@/database/models/payments/estimate-findings.model";
import { EstimateFindingParts } from "@/database/models/payments/estimate-finding-parts.model";
import { EstimateFees } from "@/database/models/payments/estimate-fees.model";
import { EstimateDiscounts } from "@/database/models/payments/estimate-discounts.model";
import { Services } from "@/database/models/services/services.model";
import { Appointments } from "@/database/models/appointments/appointments.model";
import { eq } from "drizzle-orm";

export async function recalculateEstimate(estimateId: string) {
  // 1. Get all findings for this estimate
  const findings = await Database.select()
    .from(EstimateFindings)
    .where(eq(EstimateFindings.estimateId, estimateId));

  let findingsSubtotal = 0;
  for (const f of findings) {
    if (!f.included) continue;
    // Get parts for this finding
    const parts = await Database.select()
      .from(EstimateFindingParts)
      .where(eq(EstimateFindingParts.estimateFindingId, f.id));
    const partsTotal = parts.reduce(
      (sum, p) => sum + parseFloat(p.totalPrice),
      0,
    );
    // Update the finding's partsSubtotal if needed
    if (f.partsSubtotal !== partsTotal.toString()) {
      await Database.update(EstimateFindings)
        .set({ partsSubtotal: partsTotal.toString() })
        .where(eq(EstimateFindings.id, f.id));
    }
    findingsSubtotal += partsTotal;
  }

  // 2. Get fees
  const fees = await Database.select()
    .from(EstimateFees)
    .where(eq(EstimateFees.estimateId, estimateId));
  const feesTotal = fees.reduce((sum, f) => sum + parseFloat(f.amount), 0);

  // 3. Get discounts
  const discounts = await Database.select()
    .from(EstimateDiscounts)
    .where(eq(EstimateDiscounts.estimateId, estimateId));
  let discountTotal = 0;
  // Calculate discount amounts based on current grand total (excl discounts)
  // For simplicity, we'll compute discount total as sum of fixed amounts, and percentage discounts based on subtotalBeforeDiscount.
  const subtotalBeforeDiscount = findingsSubtotal + feesTotal; // we'll add serviceSubtotal later
  for (const d of discounts) {
    let amount = 0;
    if (d.type === "fixed") {
      amount = parseFloat(d.value);
    } else {
      // percentage of subtotalBeforeDiscount (but excluding serviceSubtotal for now)
      // Actually, we need serviceSubtotal too.
      // Let's fetch serviceSubtotal from the estimate.
    }
    // We'll handle serviceSubtotal as well.
  }

  // We need to fetch the estimate to get serviceSubtotal, and also we need to recompute discounts based on the grand total without discounts.
  // This is a complex recalculation; we'll implement it carefully.
  // We'll get the estimate first.
  const [estimate] = await Database.select()
    .from(EstimatedCosts)
    .where(eq(EstimatedCosts.id, estimateId));

  const serviceSubtotal = parseFloat(estimate.serviceSubtotal);
  const baseTotal = findingsSubtotal + serviceSubtotal + feesTotal;

  let totalDiscount = 0;
  for (const d of discounts) {
    if (d.type === "fixed") {
      totalDiscount += parseFloat(d.value);
    } else {
      // percentage discount applies to baseTotal (which already includes serviceSubtotal and fees and findings subtotal)
      totalDiscount += baseTotal * (parseFloat(d.value) / 100);
    }
  }

  const grandTotal = baseTotal - totalDiscount;

  // Update the estimate
  await Database.update(EstimatedCosts)
    .set({
      findingsSubtotal: findingsSubtotal.toString(),
      feesTotal: feesTotal.toString(),
      discountTotal: totalDiscount.toString(),
      grandTotal: grandTotal.toString(),
      updatedAt: new Date(),
    })
    .where(eq(EstimatedCosts.id, estimateId));
}
