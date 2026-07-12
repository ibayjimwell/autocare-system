import { triggerPush } from './invoke';

interface CustomerPayload {
  fullname: string;
  email?: string;
}

export const customersTriggers = {
  /**
   * Fired when a new customer is registered (walk‑in or online).
   */
  async onNew(payload: CustomerPayload) {
    const title = '👤 New Customer';
    const body = payload.email
      ? `${payload.fullname} (${payload.email}) has been added.`
      : `${payload.fullname} has been added.`;
    await triggerPush('customers', 'new', title, body, '/customers');
  },

  /**
   * Fired when a customer is deactivated.
   */
  async onDeactivated(payload: CustomerPayload) {
    const title = '⛔ Customer Deactivated';
    const body = `${payload.fullname} has been deactivated.`;
    await triggerPush('customers', 'deactivated', title, body, '/customers');
  },

  /**
   * Fired when a customer is reactivated.
   */
  async onReactivated(payload: CustomerPayload) {
    const title = '✅ Customer Reactivated';
    const body = `${payload.fullname} has been reactivated.`;
    await triggerPush('customers', 'reactivated', title, body, '/customers');
  },
};