import { triggerPush } from './invoke';

interface AppointmentPayload {
  trackingNumber: string;
  customerName: string;
  appointmentDate?: string;      // YYYY-MM-DD
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

export const appointmentsTriggers = {
  /**
   * Fired when a new appointment is booked.
   */
  async onNew(payload: AppointmentPayload) {
    const title = '📅 New Appointment Booked';
    const body = `#${payload.trackingNumber} for ${payload.customerName} on ${formatDate(payload.appointmentDate)}`;
    await triggerPush('appointments', 'new', title, body, '/appointments');
  },

  /**
   * Fired when an appointment is confirmed.
   */
  async onConfirmed(payload: AppointmentPayload) {
    const title = '✅ Appointment Confirmed';
    const body = `#${payload.trackingNumber} for ${payload.customerName} has been confirmed.`;
    await triggerPush('appointments', 'confirmed', title, body, '/service-tracking');
  },

  /**
   * Fired when an appointment is cancelled.
   */
  async onCancelled(payload: AppointmentPayload) {
    const title = '❌ Appointment Cancelled';
    const body = `#${payload.trackingNumber} for ${payload.customerName}. Reason: ${payload.reason || 'N/A'}`;
    await triggerPush('appointments', 'cancelled', title, body, '/appointments');
  },

  /**
   * Fired when a reschedule request is created.
   */
  async onRescheduleRequested(payload: { trackingNumber: string; customerName?: string; requestedBy: string; newDate: string; newTime: string }) {
    const title = '📅 Reschedule Requested';
    const body = `#${payload.trackingNumber} - ${payload.customerName} requests to reschedule to ${payload.newDate} at ${payload.newTime}.`;
    await triggerPush('appointments', 'reschedule-requested', title, body, '/appointments');
  },
  
  /**
   * Fired when a reschedule request is approved.
   */
  async onRescheduleApproved(payload: { trackingNumber: string; customerName?: string; newDate: string; newTime: string }) {
    const title = '✅ Reschedule Approved';
    const body = `#${payload.trackingNumber} has been rescheduled to ${payload.newDate} at ${payload.newTime}.`;
    await triggerPush('appointments', 'reschedule-approved', title, body, '/appointments');
  },
  
  /**
   * Fired when a reschedule request is rejected.
   */
  async onRescheduleRejected(payload: { trackingNumber: string; customerName?: string }) {
    const title = '❌ Reschedule Rejected';
    const body = `#${payload.trackingNumber} reschedule request was rejected.`;
    await triggerPush('appointments', 'reschedule-rejected', title, body, '/appointments');
  },
  
};

