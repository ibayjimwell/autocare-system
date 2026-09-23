export function formatCurrency(value: unknown): string {
  const amount = Number.parseFloat(String(value ?? 0));
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return safeAmount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toNumber(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
}

export function getInventoryMargin(item: any): number {
  return Math.max(
    0,
    toNumber(item?.sellingPrice) - toNumber(item?.costPrice),
  );
}

export function getInventoryStockValue(item: any): number {
  return Math.max(0, toNumber(item?.quantity)) * toNumber(item?.costPrice);
}

export function isLowStock(item: any): boolean {
  if (!item || item.lowStockAlert === false) return false;
  return toNumber(item.quantity) <= toNumber(item.reorderLevel);
}

export function isOutOfStock(item: any): boolean {
  return toNumber(item?.quantity) <= 0;
}

export function getStockState(item: any): 'OUT' | 'LOW' | 'HEALTHY' {
  if (isOutOfStock(item)) return 'OUT';
  if (isLowStock(item)) return 'LOW';
  return 'HEALTHY';
}
