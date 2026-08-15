import { triggerPush } from './invoke';

interface PaymentPayload {
  trackingNumber: string;
  customerName?: string;
  reason?: string;
  newStatus?: string;
}

export const paymentsTriggers = {
  async onEstimateGenerated(payload: PaymentPayload) {
    const title = '📊 Estimate Generated';
    const body = payload.customerName
      ? `Estimate for #${payload.trackingNumber} (${payload.customerName}) has been created.`
      : `Estimate for #${payload.trackingNumber} has been created.`;
    await triggerPush('payments', 'estimate-generated', title, body, '/payments');
  },

  async onEstimateSentForApproval(payload: PaymentPayload) {
    const title = '📤 Estimate Sent for Approval';
    const body = payload.customerName
      ? `Estimate for #${payload.trackingNumber} (${payload.customerName}) is awaiting approval.`
      : `Estimate for #${payload.trackingNumber} is awaiting approval.`;
    await triggerPush('payments', 'estimate-sent', title, body, '/payments');
  },

  async onEstimateApproved(payload: PaymentPayload) {
    const title = '✅ Estimate Approved';
    const body = payload.customerName
      ? `Estimate for #${payload.trackingNumber} (${payload.customerName}) has been approved.`
      : `Estimate for #${payload.trackingNumber} has been approved.`;
    await triggerPush('payments', 'estimate-approved', title, body, '/payments');
  },

  async onEstimateDeclined(payload: PaymentPayload) {
    const title = '❌ Estimate Declined';
    const reasonPart = payload.reason ? ` Reason: ${payload.reason}` : '';
    const body = payload.customerName
      ? `Estimate for #${payload.trackingNumber} (${payload.customerName}) was declined.${reasonPart}`
      : `Estimate for #${payload.trackingNumber} was declined.${reasonPart}`;
    await triggerPush('payments', 'estimate-declined', title, body, '/payments');
  },

  async onFinalBillGenerated(payload: PaymentPayload) {
    const title = '🧾 Final Bill Generated';
    const body = payload.customerName
      ? `Final bill for #${payload.trackingNumber} (${payload.customerName}) is ready.`
      : `Final bill for #${payload.trackingNumber} is ready.`;
    await triggerPush('payments', 'final-bill-generated', title, body, '/payments');
  },

  async onFinalBillStatusChanged(payload: PaymentPayload) {
    const statusMap: Record<string, { title: string; body: string }> = {
      HOLD: {
        title: '⏸️ Final Bill on Hold',
        body: payload.customerName
          ? `Final bill for #${payload.trackingNumber} (${payload.customerName}) has been put on hold.`
          : `Final bill for #${payload.trackingNumber} has been put on hold.`,
      },
      OFFICIAL: {
        title: '📋 Final Bill Made Official',
        body: payload.customerName
          ? `Final bill for #${payload.trackingNumber} (${payload.customerName}) is now official.`
          : `Final bill for #${payload.trackingNumber} is now official.`,
      },
      PAID: {
        title: '💰 Final Bill Paid',
        body: payload.customerName
          ? `Payment for #${payload.trackingNumber} (${payload.customerName}) has been completed.`
          : `Payment for #${payload.trackingNumber} has been completed.`,
      },
      PENDING: {
        title: '🔄 Final Bill Back to Pending',
        body: payload.customerName
          ? `Final bill for #${payload.trackingNumber} (${payload.customerName}) is back to pending.`
          : `Final bill for #${payload.trackingNumber} is back to pending.`,
      },
    };

    const newStatus = payload.newStatus || 'PENDING';
    const config = statusMap[newStatus];
    if (!config) return;

    await triggerPush('payments', `final-bill-${newStatus.toLowerCase()}`, config.title, config.body, '/payments');
  },

  async onPaymentCompleted(payload: PaymentPayload) {
    // Already covered by onFinalBillStatusChanged(PAID)
    // Keep for backward compatibility
    const title = '💰 Payment Received';
    const body = payload.customerName
      ? `Payment for #${payload.trackingNumber} (${payload.customerName}) has been completed.`
      : `Payment for #${payload.trackingNumber} has been completed.`;
    await triggerPush('payments', 'payment-completed', title, body, '/payments');
  },
};