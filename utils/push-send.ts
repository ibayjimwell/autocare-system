import webpush from 'web-push';
import { Database } from '@/lib/drizzle';
import { PushSubscriptions } from '@/database/models/notifications/push-subscription.model';
import { StaffAccess } from '@/database/models/staffs/staff-access.model';
import { eq, inArray } from 'drizzle-orm';

webpush.setVapidDetails(
  'mailto:admin@autocare.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Generic function – sends to ALL subscriptions (kept for inventory, etc.)
export async function sendPushNotification(title: string, body: string, url: string = '/') {
  const payload = JSON.stringify({ title, body, url });
  const subs = await Database.select().from(PushSubscriptions);

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected' && (result.reason as any)?.statusCode === 410) {
      await Database.delete(PushSubscriptions).where(eq(PushSubscriptions.id, subs[i].id));
    }
  }
}

// Module column mapping
const moduleColumnMap: Record<string, any> = {
  dashboard: StaffAccess.dashboard,
  customers: StaffAccess.customers,
  appointments: StaffAccess.appointments,
  services: StaffAccess.services,
  staffs: StaffAccess.staffs,
  serviceTracking: StaffAccess.serviceTracking,
  payments: StaffAccess.payments,
  inventory: StaffAccess.inventory,
};

// Targeted function – sends only to staff who have a specific module access = true
export async function sendPushToModule(
  module: string,
  title: string,
  body: string,
  url: string = '/'
) {
  const column = moduleColumnMap[module];
  if (!column) throw new Error(`Unknown module: ${module}`);

  // Get staff IDs with access to this module
  const accessRecords = await Database
    .select({ staffId: StaffAccess.staffId })
    .from(StaffAccess)
    .where(eq(column, true));

  const staffIds = accessRecords.map(r => r.staffId);
  if (staffIds.length === 0) {
    console.log(`No staff with access to module "${module}", skipping push.`);
    return;
  }

  // Get push subscriptions for those staff
  const subs = await Database
    .select()
    .from(PushSubscriptions)
    .where(inArray(PushSubscriptions.staffId, staffIds));

  if (subs.length === 0) {
    console.log(`No push subscriptions found for staff with "${module}" access.`);
    return;
  }

  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Clean expired subscriptions
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected' && (result.reason as any)?.statusCode === 410) {
      await Database.delete(PushSubscriptions).where(eq(PushSubscriptions.id, subs[i].id));
    }
  }
}