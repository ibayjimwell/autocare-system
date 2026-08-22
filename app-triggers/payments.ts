// app-triggers/payments.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';

interface PaymentTriggerPayload {
  customerId: string;
  trackingNumber: string;
  appointmentId?: string;
  estimateId?: string;
  billId?: string;
  reason?: string;
  amount?: number;
}

function getAppointmentLink(appointmentId?: string): string {
  return appointmentId ? `/tracking?appointmentId=${appointmentId}` : '/appointments';
}

function getBillLink(billId?: string): string {
  return billId ? `/invoice/${billId}` : '/billing';
}

export const mobilePaymentsTriggers = {
  /**
   * Customer – Estimate generated (Pending status)
   * Triggered when inspection is done and estimate is created.
   */
  async onEstimateGenerated(payload: PaymentTriggerPayload) {
    const title = '📊 Estimate Generated';
    const body = `An estimate for appointment #${payload.trackingNumber} has been prepared and is pending review.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getAppointmentLink(payload.appointmentId),
    });
  },

  /**
   * Customer – Estimate sent for approval
   */
  async onEstimateSentForApproval(payload: PaymentTriggerPayload) {
    const title = '📤 Estimate Ready for Approval';
    const body = `The estimate for appointment #${payload.trackingNumber} is ready. Please review and approve it.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getAppointmentLink(payload.appointmentId),
    });
  },

  /**
   * Customer – Estimate approved
   */
  async onEstimateApproved(payload: PaymentTriggerPayload) {
    const title = '✅ Estimate Approved';
    const body = `The estimate for appointment #${payload.trackingNumber} has been approved. Work will now begin.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getAppointmentLink(payload.appointmentId),
    });
  },

  /**
   * Customer – Estimate declined
   */
  async onEstimateDeclined(payload: PaymentTriggerPayload) {
    const title = '❌ Estimate Declined';
    const reasonMsg = payload.reason ? ` Reason: ${payload.reason}` : '';
    const body = `The estimate for appointment #${payload.trackingNumber} was declined.${reasonMsg}`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getAppointmentLink(payload.appointmentId),
    });
  },

  /**
   * Customer – Final bill generated (Pending status)
   * Triggered when In Progress is completed.
   */
  async onFinalBillGenerated(payload: PaymentTriggerPayload) {
    const title = '🧾 Final Bill Generated';
    const body = `Your final bill for appointment #${payload.trackingNumber} has been generated and is pending review.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getAppointmentLink(payload.appointmentId),
    });
  },

  /**
   * Customer – Final bill on Hold
   */
  async onFinalBillHold(payload: PaymentTriggerPayload) {
    const title = '⏸️ Final Bill on Hold';
    const body = `The final bill for appointment #${payload.trackingNumber} has been placed on hold. Parking fees may apply.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getBillLink(payload.billId),
    });
  },

  /**
   * Customer – Final bill back to Pending (Unhold)
   */
  async onFinalBillBackToPending(payload: PaymentTriggerPayload) {
    const title = '🔄 Final Bill Unhold';
    const body = `The hold on the final bill for appointment #${payload.trackingNumber} has been removed.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getBillLink(payload.billId),
    });
  },

  /**
   * Customer – Final bill sent for payment (Official)
   */
  async onFinalBillOfficial(payload: PaymentTriggerPayload) {
    const title = '📋 Final Bill Ready for Payment';
    const body = `The final bill for appointment #${payload.trackingNumber} is now official and ready for payment.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getBillLink(payload.billId),
    });
  },

  /**
   * Customer – Final bill paid (Online or Cash)
   */
  async onFinalBillPaid(payload: PaymentTriggerPayload) {
    const title = '💰 Payment Successful';
    const body = `Your payment for appointment #${payload.trackingNumber} has been processed successfully.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: getBillLink(payload.billId),
    });
  },
};