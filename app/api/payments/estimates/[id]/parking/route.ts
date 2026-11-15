import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { EstimatedCosts } from '@/database/models/payments/estimated-costs.model';
import { EstimateFees } from '@/database/models/payments/estimate-fees.model';
import { EstimateDiscounts } from '@/database/models/payments/estimate-discounts.model';
import { Configurations } from '@/database/models/configurations/configurations.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';

const reply = (message: string, status: number) => NextResponse.json({ error: true, errorMessage: message }, { status });
const DAY_MS = 86400000;

// All pricing adjustments, including accrued parking, belong to Estimates.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return reply('Staff login required.', 401);
  if (session.user.access?.payments !== true) return reply('Payments permission required.', 403);
  const { id } = await params;
  if (!isValidUUID(id)) return reply('Invalid estimate ID.', 400);
  let body: any;
  try { body = await request.json(); } catch { return reply('Invalid JSON.', 400); }
  if (typeof body?.park !== 'boolean') return reply('park must be true or false.', 422);
  if (body.park && typeof body.addParkingFee !== 'boolean') return reply('Specify whether parking fees apply.', 422);

  try {
    const result = await Database.transaction(async (tx) => {
      const [estimate] = await tx.select().from(EstimatedCosts)
        .where(eq(EstimatedCosts.id, id)).for('update').limit(1);
      if (!estimate) return { error: 'Estimate not found.', code: 404 } as const;
      const now = new Date();
      if (body.park) {
        if (estimate.status !== 'PENDING') return { error: 'Only a PENDING estimate can be parked.', code: 409 } as const;
        const [row] = await tx.select().from(Configurations).where(eq(Configurations.module, 'payments')).limit(1);
        const config: any = row?.config && typeof row.config === 'object' ? row.config : {};
        const rate = Number(config.parkingFeePerDay ?? 0);
        if (!Number.isFinite(rate) || rate < 0) return { error: 'Invalid parking fee configuration.', code: 422 } as const;
        await tx.update(EstimatedCosts).set({ status: 'PARKED', parkedAt: now,
          parkingFeeEnabled: body.addParkingFee, parkingFeeRate: body.addParkingFee ? rate.toFixed(2) : '0.00', updatedAt: now })
          .where(eq(EstimatedCosts.id, id));
        return { parked: true, amount: 0 } as const;
      }
      if (estimate.status !== 'PARKED' || !estimate.parkedAt) return { error: 'Only a PARKED estimate can stop parking.', code: 409 } as const;
      const started = new Date(estimate.parkedAt);
      const days = Math.max(1, Math.ceil(Math.max(0, now.getTime() - started.getTime()) / DAY_MS));
      const rate = estimate.parkingFeeEnabled ? Number(estimate.parkingFeeRate ?? 0) : 0;
      if (!Number.isFinite(rate) || rate < 0) return { error: 'Invalid stored parking rate.', code: 422 } as const;
      const amount = Math.round(days * rate * 100) / 100;
      if (amount > 0) {
        await tx.insert(EstimateFees).values({ estimateId: id,
          title: `Parking Fee (${days} day${days === 1 ? '' : 's'})`, amount: amount.toFixed(2), findingId: null });
      }
      // Update the estimate's totals ATOMICALLY with its parking status and fee.
      // A separate recalculateEstimate() after commit could fail and leave a stale bill.
      const [fees, discounts] = await Promise.all([
        tx.select().from(EstimateFees).where(eq(EstimateFees.estimateId, id)),
        tx.select().from(EstimateDiscounts).where(eq(EstimateDiscounts.estimateId, id)),
      ]);
      const feesTotal = Math.round(fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) * 100) / 100;
      const base = Number(estimate.serviceSubtotal || 0) + Number(estimate.findingsSubtotal || 0) + feesTotal;
      const discountTotal = discounts.reduce((sum, discount) => sum +
        (discount.type === 'percentage' ? base * Number(discount.value || 0) / 100 : Number(discount.value || 0)), 0);
      const roundedDiscount = Math.round(discountTotal * 100) / 100;
      await tx.update(EstimatedCosts).set({ status: 'PENDING', parkedAt: null,
        parkingFeeEnabled: false, parkingFeeRate: null,
        feesTotal: feesTotal.toFixed(2), discountTotal: roundedDiscount.toFixed(2),
        grandTotal: (Math.round((base - discountTotal) * 100) / 100).toFixed(2),
        updatedAt: now }).where(eq(EstimatedCosts.id, id));
      return { parked: false, amount, days } as const;
    });
    if ('error' in result) return reply(result.error, result.code);
    // Transaction history logging is not allowed to invalidate a committed parking change.
    try {
      await recordPaymentTransaction({ entityType: 'ESTIMATE', entityId: id,
        eventType: 'STATUS_CHANGED', fromStatus: result.parked ? 'PENDING' : 'PARKED',
        toStatus: result.parked ? 'PARKED' : 'PENDING',
        details: { parking: true, parked: result.parked, parkingCharge: result.amount } });
    } catch (historyError) { console.error('[estimate parking] history error', historyError); }
    return NextResponse.json({ error: false, message: result.parked ? 'Estimate parked.' : 'Parking stopped; fee added to the estimate.', data: result });
  } catch (error) {
    console.error('[estimate parking]', error);
    return reply('Unable to update estimate parking. Check database migration 0060.', 500);
  }
}
