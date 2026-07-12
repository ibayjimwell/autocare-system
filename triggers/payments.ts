import { triggerPush } from './invoke';

interface PaymentPayload {
  trackingNumber: string;
  customerName?: string;
  reason?: string;
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

  async onPaymentCompleted(payload: PaymentPayload) {
    const title = '💰 Payment Received';
    const body = payload.customerName
      ? `Payment for #${payload.trackingNumber} (${payload.customerName}) has been completed.`
      : `Payment for #${payload.trackingNumber} has been completed.`;
    await triggerPush('payments', 'payment-completed', title, body, '/payments');
  },
};