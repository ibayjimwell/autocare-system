import { triggerPush } from './invoke';

interface InventoryPayload {
  itemName: string;
  quantity?: number;       // for restock / POS
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
    await triggerPush('inventory', 'new-item', title, body, '/inventory');
  },

  /**
   * Stock restocked.
   */
  async onRestock(payload: InventoryPayload) {
    const title = '📥 Stock Restocked';
    const body = `+"${payload.quantity ?? '?'} units of "${payload.itemName}" have been added.`;
    await triggerPush('inventory', 'restock', title, body, '/inventory');
  },

  /**
   * POS sale completed.
   */
  async onPosSale(payload: InventoryPayload) {
    const title = '🛒 POS Sale Completed';
    const body = payload.transactionTotal
      ? `Sale #${payload.transactionId?.slice(0, 8) ?? 'N/A'} completed for ${payload.transactionTotal}.`
      : `A new POS transaction has been recorded.`;
    await triggerPush('inventory', 'pos-sale', title, body, '/inventory');
  },
};