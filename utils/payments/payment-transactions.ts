import { Database } from '@/lib/drizzle';
import { PaymentTransactions } from '@/database/models/payments/payment-transactions.model';

export async function recordPaymentTransaction(input: {
  entityType: 'ESTIMATE' | 'FINAL_BILL' | 'POS';
  entityId?: string | null;
  appointmentId?: string | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  amount?: number | string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  actorStaffId?: string | null;
  details?: Record<string, unknown> | null;
}) {
  try {
    await Database.insert(PaymentTransactions).values({
      entityType: input.entityType,
      entityId: input.entityId || null,
      appointmentId: input.appointmentId || null,
      eventType: input.eventType,
      fromStatus: input.fromStatus || null,
      toStatus: input.toStatus || null,
      amount: input.amount == null ? null : Number(input.amount).toFixed(2),
      paymentMethod: input.paymentMethod || null,
      referenceNumber: input.referenceNumber || null,
      actorStaffId: input.actorStaffId || null,
      details: input.details || null,
    });
  } catch (error) {
    // Auditing must never break the payment operation itself.
    console.error('[payment-transactions] Failed to record audit event:', error);
  }
}
