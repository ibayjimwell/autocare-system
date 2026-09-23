function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeInventoryBarcode(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const barcode = String(value).trim();
  return barcode ? barcode : null;
}

export function validateSellingPrice(
  costPrice: unknown,
  sellingPrice: unknown,
): string | null {
  const cost = toNumber(costPrice);
  const selling = toNumber(sellingPrice);

  if (cost < 0) {
    return 'Cost price cannot be negative.';
  }

  if (selling < 0) {
    return 'Selling price cannot be negative.';
  }

  if (selling < cost) {
    return 'Selling price must be greater than or equal to cost price.';
  }

  return null;
}

export function validateInventoryData(body: any): string[] {
  const errors: string[] = [];

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const unit = typeof body?.unit === 'string' ? body.unit.trim() : '';
  const barcode = normalizeInventoryBarcode(body?.barcode);

  if (!name) {
    errors.push('Item name is required.');
  } else if (name.length > 255) {
    errors.push('Item name must be 255 characters or fewer.');
  }

  if (!unit) {
    errors.push('Unit is required.');
  } else if (unit.length > 50) {
    errors.push('Unit must be 50 characters or fewer.');
  }

  if (barcode && barcode.length > 64) {
    errors.push('Barcode must be 64 characters or fewer.');
  }

  const quantity = toNumber(body?.quantity);
  const reorderLevel = toNumber(body?.reorderLevel);
  const costPrice = toNumber(body?.costPrice);
  const sellingPrice = toNumber(body?.sellingPrice);

  if (quantity < 0) {
    errors.push('Quantity cannot be negative.');
  } else if (!Number.isInteger(quantity)) {
    errors.push('Quantity must be a whole number.');
  }

  if (reorderLevel < 0) {
    errors.push('Reorder level cannot be negative.');
  } else if (!Number.isInteger(reorderLevel)) {
    errors.push('Reorder level must be a whole number.');
  }

  if (costPrice < 0) {
    errors.push('Cost price cannot be negative.');
  }

  if (sellingPrice < 0) {
    errors.push('Selling price cannot be negative.');
  }

  const sellingPriceError = validateSellingPrice(
    costPrice,
    sellingPrice,
  );

  if (sellingPriceError) {
    errors.push(sellingPriceError);
  }

  return errors;
}
