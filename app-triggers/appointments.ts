// app-triggers/appointments.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';

interface MobileAppointmentPayload {
  customerId: string;
  trackingNumber: string;
  appointmentDate?: string;
  reason?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const mobileAppointmentsTriggers = {
  /** Customer – new appointment booked */
  async onNew(payload: MobileAppointmentPayload) {
    const title = '📅 Appointment Booked';
    const body = `Your appointment #${payload.trackingNumber} on ${formatDate(payload.appointmentDate)} has been booked.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: '/appointments',
    });
  },

  /** Customer – appointment confirmed */
  async onConfirmed(payload: MobileAppointmentPayload) {
    const title = '✅ Appointment Confirmed';
    const body = `Your appointment #${payload.trackingNumber} on ${formatDate(payload.appointmentDate)} has been confirmed.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: `/tracking?appointmentId=${payload.trackingNumber}`,
    });
  },

  /** Customer – appointment cancelled (with reason) */
  async onCancelled(payload: MobileAppointmentPayload) {
    const title = '❌ Appointment Cancelled';
    const body = `Your appointment #${payload.trackingNumber} has been cancelled. Reason: ${payload.reason || 'N/A'}`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: '/appointments',
    });
  },

  /** Customer – appointment moved to UNDER_INSPECTION */
  async onUnderInspection(payload: MobileAppointmentPayload) {
    const title = '🔍 Inspection Started';
    const body = `Your vehicle for appointment #${payload.trackingNumber} is now being inspected.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: `/tracking?appointmentId=${payload.trackingNumber}`,
    });
  },

  /** Customer – waiting for estimate approval */
  async onWaitingForApproval(payload: MobileAppointmentPayload) {
    const title = '📊 Estimate Ready for Review';
    const body = `The estimate for appointment #${payload.trackingNumber} is ready. Please review and approve.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: `/tracking?appointmentId=${payload.trackingNumber}`,
    });
  },

  /** Customer – repair work in progress */
  async onInProgress(payload: MobileAppointmentPayload) {
    const title = '🔧 Repair In Progress';
    const body = `Your vehicle for appointment #${payload.trackingNumber} is now being repaired.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: `/tracking?appointmentId=${payload.trackingNumber}`,
    });
  },

  /** Customer – all work completed */
  async onCompleted(payload: MobileAppointmentPayload) {
    const title = '🏁 Service Completed';
    const body = `All work for appointment #${payload.trackingNumber} has been completed.`;
    await sendPushToCustomer(payload.customerId, title, body, {
      url: `/tracking?appointmentId=${payload.trackingNumber}`,
    });
  },
};