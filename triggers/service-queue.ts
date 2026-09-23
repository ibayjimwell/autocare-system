import {
  triggerPush,
} from './invoke';

/* ================================================================
   TYPES
================================================================ */

interface QueuePositionPayload {
  appointmentId: string;
  trackingNumber: string;
  newPosition: number;
}

interface CustomerArrivalPayload {
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
   CUSTOMER PUSH COMPATIBILITY

   The existing project already has a customer push helper at:

     @/lib/push/customer-push

   Different versions of the project have used either positional
   arguments or an options object. This adapter supports both forms
   without changing the existing helper implementation.
================================================================ */

async function sendCustomerPush(
  payload: CustomerArrivalRequestPayload,
) {
  try {
    const pushModule =
      (await import(
        '@/lib/push/customer-push'
      )) as any;

    const sendPush =
      pushModule?.sendPushToCustomer;

    if (
      typeof sendPush !==
      'function'
    ) {
      console.warn(
        '[serviceQueueTriggers] sendPushToCustomer is unavailable; realtime arrival request remains active.',
      );

      return;
    }

    const title =
      'AutoCare: Are You Arriving Today?';

    const body =
      `AutoCare is asking whether ${payload.customerName || 'you'} will be arriving today.`;

    const data = {
      type: 'ARRIVAL_REQUEST',
      appointmentId:
        payload.appointmentId,
      trackingNumber:
        payload.trackingNumber,
      screen: '/tracking',
      route: `/tracking?appointmentId=${encodeURIComponent(
        payload.appointmentId,
      )}`,
    };

    /*
     * Compatibility forms:
     *
     *   sendPushToCustomer(customerId, title, body, data)
     *   sendPushToCustomer(customerId, title, body)
     *   sendPushToCustomer({ customerId, title, body, data })
     *
     * The function arity is used only to select the established
     * project-compatible calling convention.
     */
    if (
      sendPush.length >=
      4
    ) {
      await sendPush(
        payload.customerId,
        title,
        body,
        data,
      );

      return;
    }

    if (
      sendPush.length ===
      3
    ) {
      await sendPush(
        payload.customerId,
        title,
        body,
      );

      return;
    }

    await sendPush({
      customerId:
        payload.customerId,
      title,
      body,
      data,
    });
  } catch (error) {
    /*
     * Push delivery must never block the queue database update.
     * The customer can still receive the arrival request through
     * Supabase Realtime while the app is in the foreground.
     */
    console.error(
      '[serviceQueueTriggers] Customer push failed:',
      error,
    );
  }
}

/* ================================================================
   MOBILE / CUSTOMER TRIGGERS
================================================================ */

export const mobileServiceQueueTriggers = {
  /* ==============================================================
     STAFF ASKS CUSTOMER ABOUT ARRIVAL
  ============================================================== */

  async onArrivalQuestion(
    payload: CustomerArrivalRequestPayload,
  ) {
    await sendCustomerPush(
      payload,
    );
  },

  /* ==============================================================
     QUEUE POSITION CHANGED

     Kept for compatibility with the existing legacy reorder route.
     The effective queue order is still calculated by the canonical
     queue API; the push only informs the customer.
  ============================================================== */

  async onPositionChanged(
    payload: CustomerQueuePositionPayload,
  ) {
    try {
      const pushModule =
        (await import(
          '@/lib/push/customer-push'
        )) as any;

      const sendPush =
        pushModule?.sendPushToCustomer;

      if (
        typeof sendPush !==
        'function'
      ) {
        console.warn(
          '[mobileServiceQueueTriggers] sendPushToCustomer is unavailable.',
        );
        return;
      }

      const title =
        '🔄 Service Queue Updated';

      const body =
        `Your appointment #${payload.trackingNumber} is now shown at queue position #${payload.newPosition}.`;

      const data = {
        type: 'QUEUE_POSITION_CHANGED',
        appointmentId: null,
        trackingNumber:
          payload.trackingNumber,
        queuePosition:
          payload.newPosition,
        screen: '/tracking',
      };

      if (
        sendPush.length >=
        4
      ) {
        await sendPush(
          payload.customerId,
          title,
          body,
          data,
        );
        return;
      }

      if (
        sendPush.length ===
        3
      ) {
        await sendPush(
          payload.customerId,
          title,
          body,
        );
        return;
      }

      await sendPush({
        customerId:
          payload.customerId,
        title,
        body,
        data,
      });
    } catch (error) {
      console.error(
        '[mobileServiceQueueTriggers] Queue position push failed:',
        error,
      );
    }
  },
};
