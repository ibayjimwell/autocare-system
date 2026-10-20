import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { CustomerNotificationRecords } from '@/database/models/notifications/customer-notification-record.model';
import { sendPushToCustomer } from '@/lib/push/customer-push';
import { sendSMS } from '@/utils/sms';
import {
  isValidPhilippinePhone,
  normalizePhilippinePhone,
} from '@/utils/phone';
import { eq } from 'drizzle-orm';
import { after } from 'next/server';

/**
 * One customer event -> two independent delivery attempts:
 *   1. Expo push to that customer's registered devices
 *   2. httpSMS to the phone saved on that customer's account
 *
 * Do not look up the phone number from a submitted request or from the
 * currently logged-in staff member. The customerId is authoritative.
 *
 * Both channels run even if the other is unavailable. A successful push
 * ticket or accepted SMS request is not proof of handset delivery.
 */

export type CustomerNotificationChannelStatus =
  | 'attempted'
  | 'submitted'
  | 'skipped'
  | 'failed';

export interface CustomerNotificationResult {
  push: CustomerNotificationChannelStatus;
  sms: CustomerNotificationChannelStatus;
}

function toSMSBody(body: string): string {
  // SMS uses plain text (no emoji title or internal mobile route).
  // Collapse line breaks and limit unusually long notes/reasons to
  // reduce the risk of excessive multipart SMS charges.
  const text = `AutoCare: ${body.replace(/\s+/g, ' ').trim()}`;
  return text.length > 320
    ? `${text.slice(0, 317).trimEnd()}...`
    : text;
}

async function sendCustomerSMS(
  customerId: string,
  body: string,
): Promise<'submitted' | 'skipped'> {
  const [customer] = await Database.select({
    phone: Customers.phone,
    deactivated: Customers.deactivated,
  })
    .from(Customers)
    .where(eq(Customers.id, customerId))
    .limit(1);

  if (!customer) {
    console.warn('[CustomerNotify] SMS skipped: customer not found.');
    return 'skipped';
  }

  if (customer.deactivated === true) {
    console.warn('[CustomerNotify] SMS skipped: customer deactivated.');
    return 'skipped';
  }

  const phone = normalizePhilippinePhone(customer.phone);
  if (!isValidPhilippinePhone(phone)) {
    console.warn('[CustomerNotify] SMS skipped: customer phone invalid or missing.');
    return 'skipped';
  }

  await sendSMS(phone, toSMSBody(body));
  return 'submitted';
}

async function deliverCustomerNotification(
  customerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<CustomerNotificationResult> {
  if (!customerId || !title?.trim() || !body?.trim()) {
    console.warn('[CustomerNotify] Skipped: missing customer, title, or body.');
    return { push: 'skipped', sms: 'skipped' };
  }

  // Save an inbox record BEFORE attempting any transport. A customer must
  // still see this event even when they had no push token, notification
  // permission was denied, the handset was offline, or Expo dropped the push.
  // If the new inbox table is not deployed yet, existing push and SMS delivery
  // continues rather than failing the appointment/task operation.
  let notificationId: string | undefined;
  try {
    const [saved] = await Database.insert(CustomerNotificationRecords)
      .values({
        customerId,
        title: title.trim(),
        body: body.trim(),
        url: typeof data?.url === 'string' ? data.url : null,
        module: typeof data?.module === 'string' ? data.module : 'app',
        event: typeof data?.event === 'string' ? data.event :
          (typeof data?.type === 'string' ? data.type : 'push'),
      })
      .returning({ id: CustomerNotificationRecords.id });
    notificationId = saved?.id;
  } catch (error) {
    console.error('[CustomerNotify] Could not persist notification inbox record:', error);
  }

  // SMS and push remain independent attempts. Never skip one because the
  // other channel failed or because writing inbox history failed.
  const pushData = { ...(data || {}), customerId, ...(notificationId ? { notificationId } : {}) };
  const [pushResult, smsResult] = await Promise.allSettled([
    sendPushToCustomer(customerId, title, body, pushData),
    sendCustomerSMS(customerId, body),
  ]);

  const result: CustomerNotificationResult = {
    // The existing push function can resolve even when there are no
    // tokens or an individual Expo ticket failed. Thus 'attempted',
    // never 'delivered'. Use Expo tickets/receipts to verify delivery.
    push: pushResult.status === 'fulfilled' ? 'attempted' : 'failed',
    sms: smsResult.status === 'fulfilled' ? smsResult.value : 'failed',
  };

  if (pushResult.status === 'rejected') {
    console.error(
      '[CustomerNotify] Push attempt failed:',
      pushResult.reason instanceof Error
        ? pushResult.reason.message
        : 'Unknown push error',
    );
  }

  if (smsResult.status === 'rejected') {
    console.error(
      '[CustomerNotify] SMS attempt failed:',
      smsResult.reason instanceof Error
        ? smsResult.reason.message
        : 'Unknown SMS error',
    );
  }

  console.info('[CustomerNotify] Channel results:', result);
  return result;
}

/**
 * Existing AutoCare API routes often call mobile triggers without await:
 *   mobileAppointmentsTriggers.onNew(payload).catch(console.error)
 *
 * Next.js 16 `after()` keeps this promise alive on supported serverless
 * hosts even after the HTTP response finishes. The promise is still
 * returned so callers that do await continue to work unchanged.
 */
function keepNotificationAlive<T>(work: Promise<T>): Promise<T> {
  try {
    after(() => work);
  } catch {
    // Non-request contexts (scripts/tests) have no Next.js request
    // lifecycle. In those contexts the caller MUST await the promise.
    console.warn(
      '[CustomerNotify] No request lifecycle: await this notification promise.',
    );
  }
  return work;
}

export function sendCustomerNotification(
  customerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<CustomerNotificationResult> {
  return keepNotificationAlive(
    deliverCustomerNotification(customerId, title, body, data),
  );
}

/**
 * Inspection and repair task triggers only have an appointment ID.
 * Begin the lookup here and register the whole lookup + send operation
 * with `after()` BEFORE the API route returns a response.
 */
export function sendAppointmentCustomerNotification(
  appointmentId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<CustomerNotificationResult> {
  const work = (async (): Promise<CustomerNotificationResult> => {
    try {
      const [appointment] = await Database.select({
        customerId: Appointments.customerId,
      })
        .from(Appointments)
        .where(eq(Appointments.id, appointmentId))
        .limit(1);

      if (!appointment?.customerId) {
        console.warn('[CustomerNotify] Appointment customer not found.');
        return { push: 'skipped', sms: 'skipped' };
      }

      return deliverCustomerNotification(
        appointment.customerId,
        title,
        body,
        data,
      );
    } catch (error) {
      console.error(
        '[CustomerNotify] Appointment lookup failed:',
        error instanceof Error ? error.message : 'Unknown database error',
      );
      return { push: 'failed', sms: 'failed' };
    }
  })();

  return keepNotificationAlive(work);
}
