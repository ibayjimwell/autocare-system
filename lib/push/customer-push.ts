// lib/push/customer-push.ts
import { Expo } from 'expo-server-sdk';
import { Database } from '@/lib/drizzle';
import { CustomerPushSubscriptions } from '@/database/models/notifications/customer-push-subscription.model';
import { eq } from 'drizzle-orm';

const expo = new Expo();

export async function sendPushToCustomer(
  customerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  // Fetch all push tokens for this customer
  const subs = await Database
    .select({ token: CustomerPushSubscriptions.expoPushToken })
    .from(CustomerPushSubscriptions)
    .where(eq(CustomerPushSubscriptions.customerId, customerId));

  if (subs.length === 0) {
    console.log(`No push tokens for customer ${customerId}, skipping.`);
    return;
  }

  const messages: any[] = [];
  for (const sub of subs) {
    if (!Expo.isExpoPushToken(sub.token)) {
      console.warn(`Invalid Expo push token for customer ${customerId}: ${sub.token}`);
      continue;
    }
    messages.push({
      to: sub.token,
      sound: 'notification_sound.wav',
      title,
      body,
      data: data || {},
    });
  }

  if (messages.length === 0) return;

  // Send in chunks (Expo recommends chunks of 100)
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      // Handle tickets (e.g., remove invalid tokens)
      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        if (ticket.status === 'error') {
          console.error(`Push error: ${ticket.message}`);
          // If the error is DeviceNotRegistered, remove the token
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const token = chunk[i].to;
            await Database
              .delete(CustomerPushSubscriptions)
              .where(eq(CustomerPushSubscriptions.expoPushToken, token));
          }
        }
      }
    } catch (err) {
      console.error('Expo push chunk failed:', err);
    }
  }
}