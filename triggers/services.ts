import { triggerPush } from './invoke';

interface ServicePayload {
  name: string;
  type?: string;
}

export const servicesTriggers = {
  /**
   * Fired when a new service is created.
   */
  async onNew(payload: ServicePayload) {
    const typeLabel = payload.type ? ` (${payload.type})` : '';
    const title = '🛠️ New Service Added';
    const body = `"${payload.name}"${typeLabel} has been added to the catalog.`;
    await triggerPush('services', 'new', title, body, '/services');
  },

  /**
   * Fired when a service is enabled (activated).
   */
  async onEnabled(payload: ServicePayload) {
    const title = '✅ Service Enabled';
    const body = `"${payload.name}" is now active.`;
    await triggerPush('services', 'enabled', title, body, '/services');
  },

  /**
   * Fired when a service is disabled (deactivated).
   */
  async onDisabled(payload: ServicePayload) {
    const title = '⛔ Service Disabled';
    const body = `"${payload.name}" has been disabled.`;
    await triggerPush('services', 'disabled', title, body, '/services');
  },
};