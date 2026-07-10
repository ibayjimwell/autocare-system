export const formatPrice = (price: any): string => {
  const num = parseFloat(price);
  return isNaN(num) ? "0.00" : num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
};

export const typeBadgeConfig: Record<string, string> = {
  PMS: "bg-emerald-100 text-emerald-800",
  REPAIR: "bg-primary/10 text-primary",
  CHECKUP: "bg-blue-100 text-blue-800",
};

export const SERVICE_TYPES = ["PMS", "REPAIR", "CHECKUP"] as const;