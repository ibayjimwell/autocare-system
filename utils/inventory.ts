export function validateInventoryData(data: any): string[] {
  const errors: string[] = [];
  if (
    !data.name ||
    typeof data.name !== "string" ||
    data.name.trim().length === 0
  ) {
    errors.push("Name is required.");
  }
  if (
    !data.unit ||
    typeof data.unit !== "string" ||
    data.unit.trim().length === 0
  ) {
    errors.push("Unit is required.");
  }
  if (
    data.quantity !== undefined &&
    (typeof data.quantity !== "number" || data.quantity < 0)
  ) {
    errors.push("Quantity must be a non-negative number.");
  }
  if (
    data.price !== undefined &&
    (isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0)
  ) {
    errors.push("Price must be a non-negative number.");
  }
  return errors;
}
