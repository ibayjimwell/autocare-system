import {
  triggerPush,
} from './invoke';
import { sendCustomerNotification } from '@/lib/notifications/customer-notification';

/* ================================================================
   TYPES
================================================================ */

interface QueuePositionPayload {
  appointmentId: string;
  trackingNumber: string;
  newPosition: number;
}

interface CustomerArrivalPayload {
  appointmentId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number | null;
  plateNumber?: string;
  trackingNumber: string;
  customerName?: string;
  arrivalStatus:
    | 'ARRIVING'
    | 'ARRIVED'
    | 'NOT_ARRIVED';
}

interface CustomerQueuePositionPayload {
  customerId: string;
  trackingNumber: string;
  newPosition: number;
}

interface CustomerArrivalRequestPayload {
  requestAt: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  plateNumber: string;
  appointmentId: string;
  customerId: string;
  trackingNumber: string;
  customerName?: string;
}

/* ================================================================
   STAFF NOTIFICATIONS
================================================================ */

export const serviceQueueTriggers = {
  /* ==============================================================
     QUEUE POSITION
  ============================================================== */

  async onPositionChanged(
    payload: QueuePositionPayload,
  ) {
    const title =
      '🔄 Queue Position Updated';

    const body =
      `Appointment #${payload.trackingNumber} is now at position #${payload.newPosition}.`;

    await triggerPush(
      'service-tracking',
      'queue-changed',
      title,
      body,
      '/service-tracking',
    );
  },

  /* ==============================================================
     CUSTOMER ARRIVAL STATUS
  ============================================================== */

  async onCustomerArriving(
    payload: CustomerArrivalPayload,
  ) {
    let title =
      '🚗 Customer Arrival Update';

    let body =
      `Appointment #${payload.trackingNumber} has an updated arrival status.`;

    if (
      payload.arrivalStatus ===
      'ARRIVING'
    ) {
      title =
        '🚗 Customer Is Arriving';

      body =
        `${payload.customerName || 'Customer'} for appointment #${payload.trackingNumber} is arriving.`;
    }

    if (
      payload.arrivalStatus ===
      'ARRIVED'
    ) {
      title =
        '✅ Customer Arrived';

      body =
        `${payload.customerName || 'Customer'} for appointment #${payload.trackingNumber} has arrived.`;
    }

    if (
      payload.arrivalStatus ===
      'NOT_ARRIVED'
    ) {
      title =
        '🔵 Customer Marked Not Arrived';

      body =
        `${payload.customerName || 'Customer'} for appointment #${payload.trackingNumber} is marked Not Arrived.`;
    }

    const vehicle = [payload.vehicleMake, payload.vehicleModel, payload.vehicleYear]
      .filter(value => value !== undefined && value !== null && value !== '').join(' ');
    const plate = payload.plateNumber ? ` (Plate ${payload.plateNumber})` : '';
    const customer = payload.customerName || 'Customer';
    if (payload.arrivalStatus === 'ARRIVING') {
      body = `${customer} and their ${vehicle || 'vehicle'}${plate} will arrive today.`;
    } else if (payload.arrivalStatus === 'NOT_ARRIVED') {
      body = `${customer} and their ${vehicle || 'vehicle'}${plate} will not arrive today.`;
    }

    await triggerPush(
      'service-tracking',
      'customer-arrival',
      title,
      body,
      '/service-tracking',
    );
  },
};

/* ================================================================
   CUSTOMER NOTIFICATIONS (PUSH + SMS)
================================================================ */


/** Only mobile customers receive SMS; staff web-push remains unchanged. */
export const mobileServiceQueueTriggers = {
  async onArrivalQuestion(
    payload: CustomerArrivalRequestPayload,
  ) {
    const title = 'AutoCare: Are You Arriving Today?';
    const vehicle = [
      payload.vehicleMake,
      payload.vehicleModel,
      payload.vehicleYear,
    ].filter(value => value !== null && value !== undefined && value !== '').join(' ');
    const plate = payload.plateNumber
      ? ` (Plate ${payload.plateNumber})`
      : '';
    const body = `Please confirm if you will arrive today for appointment #${payload.trackingNumber}, ${vehicle || 'your vehicle'}${plate}. Open AutoCare to respond.`;

    await sendCustomerNotification(payload.customerId, title, body, {
      type: 'ARRIVAL_REQUEST',
      url: `/tracking?appointmentId=${encodeURIComponent(payload.appointmentId)}`,
      appointmentId: payload.appointmentId,
      trackingNumber: payload.trackingNumber,
      screen: '/tracking',
      route: `/tracking?appointmentId=${encodeURIComponent(payload.appointmentId)}`,
      requestAt: payload.requestAt,
      customerId: payload.customerId,
      vehicleMake: payload.vehicleMake,
      vehicleModel: payload.vehicleModel,
      vehicleYear: payload.vehicleYear,
      plateNumber: payload.plateNumber,
    });
  },

  async onPositionChanged(
    payload: CustomerQueuePositionPayload,
  ) {
    const title = '🔄 Service Queue Updated';
    const body = `Your appointment #${payload.trackingNumber} is now shown at queue position #${payload.newPosition}.`;

    await sendCustomerNotification(payload.customerId, title, body, {
      type: 'QUEUE_POSITION_CHANGED',
      appointmentId: null,
      trackingNumber: payload.trackingNumber,
      queuePosition: payload.newPosition,
      screen: '/tracking',
    });
  },
};
