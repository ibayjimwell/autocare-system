import { triggerPush } from './invoke';

interface InventoryPayload {
  itemName: string;
  quantity?: number;
  transactionTotal?: string;
  transactionId?: string;
}

export const inventoryTriggers = {
  /**
   * New inventory item added.
   */
  async onNewItem(payload: InventoryPayload) {
    const title = '📦 New Inventory Item';
    const body = `"${payload.itemName}" has been added to inventory.`;
    await triggerPush(
      'inventory',
      'new-item',
      title,
      body,
      '/inventory',
    );
  },

  /**
   * Stock restocked.
   */
  async onRestock(payload: InventoryPayload) {
    const title = '📥 Stock Restocked';
    const body = `+"${payload.quantity ?? '?'} units of "${payload.itemName}" have been added.`;
    await triggerPush(
      'inventory',
      'restock',
      title,
      body,
      '/inventory',
    );
  },

  /**
   * POS sale completed.
   */
  async onPosSale(payload: InventoryPayload) {
    const title = '🛒 POS Sale Completed';
    const body = payload.transactionTotal
      ? `Sale #${payload.transactionId?.slice(0, 8) ?? 'N/A'} completed for ${payload.transactionTotal}.`
      : `A new POS transaction has been recorded.`;

    await triggerPush(
      'inventory',
      'pos-sale',
      title,
      body,
      '/inventory',
    );
  },

  /**
   * Inventory items moved to KEEP.
   */
  async onKept(payload: InventoryPayload) {
    const title = '📦 Inventory Items Kept';
    const body = payload.quantity
      ? `${payload.quantity} unit(s) are now being held for a service appointment.`
      : `${payload.itemName} is now being held for a service appointment.`;

    await triggerPush(
      'inventory',
      'kept',
      title,
      body,
      '/inventory',
    );
  },

  /**
   * Inventory items moved from KEEP to USED.
   */
  async onUsed(payload: InventoryPayload) {
    const title = '✅ Inventory Items Used';
    const body = payload.quantity
      ? `${payload.quantity} unit(s) have been marked as used.`
      : `${payload.itemName} has been marked as used.`;

    await triggerPush(
      'inventory',
      'used',
      title,
      body,
      '/inventory',
    );
  },

  /**
   * Inventory items returned after appointment cancellation.
   */
  async onRestored(payload: InventoryPayload) {
    const title = '↩️ Inventory Items Restored';
    const body = payload.quantity
      ? `${payload.quantity} unit(s) have been returned to actual inventory after cancellation.`
      : `${payload.itemName} has been returned to actual inventory.`;

    await triggerPush(
      'inventory',
      'restored',
      title,
      body,
      '/inventory',
    );
  },
};
