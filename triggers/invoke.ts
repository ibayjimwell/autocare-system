import { sendPushToModule } from '@/utils/push-send';

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
    await sendPushToModule(module, title, body, url);
    console.log(`🔔 Push sent for module "${module}", event "${event}"`);
  } catch (err) {
    console.error(`Failed to send push for module "${module}"`, err);
    // Non‑critical – do not fail the main request
  }
}