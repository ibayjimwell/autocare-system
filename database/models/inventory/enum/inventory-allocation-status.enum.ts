import { pgEnum } from 'drizzle-orm/pg-core';

export const InventoryAllocationStatusEnum = pgEnum(
  'inventory_allocation_status',
  ['KEEP', 'USED', 'RESTORED'],
);
