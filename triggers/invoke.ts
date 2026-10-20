import { sendPushToModule } from '@/utils/push-send';
import { after } from 'next/server';

/**
 * Generic function to call push notification for a specific module.
 * @param module - the module name (e.g., 'appointments', 'inventory')
 * @param event - event type (e.g., 'new', 'confirmed', 'cancelled')
 * @param title - notification title
 * @param body - notification body
 * @param url - deep link URL (optional)
 */
export async function triggerPush(
  module: string,
  event: string,
  title: string,
  body: string,
  url: string = '/'
) {
  try {
    // Register work with Next.js before an API route returns. Many current
    // AutoCare callers intentionally fire and forget their trigger promises.
    // Next.js `after()` allows the staff inbox to be persisted even when the
    // initiating HTTP response has already been sent on Vercel.
    const work = sendPushToModule(module, title, body, url, event);
    try {
      after(() => work);
    } catch {
      // Non-request contexts must await triggerPush() themselves.
    }
    await work;
    console.log(`🔔 Push sent for module "${module}", event "${event}"`);
  } catch (err) {
    console.error(`Failed to send push for module "${module}"`, err);
    // Non‑critical – do not fail the main request
  }
}