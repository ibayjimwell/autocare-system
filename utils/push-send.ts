import webpush from 'web-push';
import { Database } from '@/lib/drizzle';
import { PushSubscriptions } from '@/database/models/notifications/push-subscription.model';
import { StaffNotifications } from '@/database/models/notifications/staff-notification.model';
import { StaffAccess } from '@/database/models/staffs/staff-access.model';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { eq, inArray } from 'drizzle-orm';

webpush.setVapidDetails(
  'mailto:admin@autocare.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const moduleColumnMap: Record<string, any> = {
  dashboard: StaffAccess.dashboard,
  customers: StaffAccess.customers,
  appointments: StaffAccess.appointments,
  services: StaffAccess.services,
  staffs: StaffAccess.staffs,
  serviceTracking: StaffAccess.serviceTracking,
  'service-tracking': StaffAccess.serviceTracking, // queue triggers use this spelling
  payments: StaffAccess.payments,
  inventory: StaffAccess.inventory,
};

type NotificationPayload = {
  id: string;
  staffId: string;
  module: string;
  event: string;
  title: string;
  body: string;
  url: string;
};

async function sendToRecipients(
  staffIds: string[],
  module: string,
  event: string,
  title: string,
  body: string,
  url: string,
): Promise<void> {
  const ids = Array.from(new Set(staffIds.filter(Boolean)));
  if (ids.length === 0) return;

  // Persist first. Staff without browser permission or online devices still
  // receive their inbox records. Never persist to a shared browser cache.
  const stored = await Database.insert(StaffNotifications)
    .values(ids.map(staffId => ({ staffId, title, body, url, module, event })))
    .returning({ id: StaffNotifications.id, staffId: StaffNotifications.staffId });

  const byStaff = new Map(stored.map(item => [item.staffId, item.id]));
  const subscriptions = await Database.select().from(PushSubscriptions)
    .where(inArray(PushSubscriptions.staffId, ids));

  const results = await Promise.allSettled(subscriptions.map(sub => {
    const notificationId = byStaff.get(sub.staffId);
    if (!notificationId) return Promise.resolve();
    const payload: NotificationPayload = {
      id: notificationId,
      staffId: sub.staffId,
      module,
      event,
      title,
      body,
      url,
    };
    return webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
  }));

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === 'rejected') {
      const status = (result.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await Database.delete(PushSubscriptions).where(eq(PushSubscriptions.id, subscriptions[i].id));
      } else {
        console.warn('[StaffPush] Push delivery attempt failed:', status || 'unknown');
      }
    }
  }
}

// Existing generic behavior: target all staff. Now each staff also gets an
// independent saved inbox record, regardless of push subscription state.
export async function sendPushNotification(title: string, body: string, url: string = '/') {
  const staff = await Database.select({ id: Staffs.id }).from(Staffs);
  await sendToRecipients(staff.map(row => row.id), 'app', 'push', title, body, url);
}

// Existing module targeting is preserved, including staff who have access but
// no push subscription. `event` is optional for older callers.
export async function sendPushToModule(
  module: string,
  title: string,
  body: string,
  url: string = '/',
  event: string = 'push',
) {
  const column = moduleColumnMap[module];
  if (!column) throw new Error(`Unknown module: ${module}`);

  const permissions = await Database.select({ staffId: StaffAccess.staffId })
    .from(StaffAccess).where(eq(column, true));
  await sendToRecipients(permissions.map(row => row.staffId), module, event, title, body, url);
}
