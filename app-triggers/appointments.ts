// app-triggers/appointments.ts
import { sendPushToCustomer } from '@/lib/push/customer-push';

interface MobileAppointmentPayload {
  customerId: string;
  trackingNumber: string;
  appointmentDate?: string;   // YYYY-MM-DD
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
};