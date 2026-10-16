export const formatPrice = (price: any): string => {
  const amount = Number(price) || 0;
  return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SERVICE_TYPES = ['PMS', 'REPAIR', 'DIAGNOSTIC'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const REPAIR_SUBCATEGORIES = [
  'ENGINE', 'STEERING', 'BRAKE & TIRES', 'IGNITION', 'COOLING',
  'BELTS', 'OIL SEAL', 'DRIVE TRAIN', 'AIR INTAKE & EXHAUST',
  'LIGHTS & HORN',
] as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  PMS: 'PMS', REPAIR: 'Repair', DIAGNOSTIC: 'Diagnostic',
};

export const typeBadgeConfig: Record<string, string> = {
  PMS: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  REPAIR: 'border-primary/20 bg-primary/10 text-primary',
  DIAGNOSTIC: 'border-blue-300 bg-blue-100 text-blue-800',
};

export function serviceCategoryLabel(service: { type?: string | null; subcategory?: string | null }): string {
  const main = SERVICE_TYPE_LABELS[service.type || ''] || service.type || 'Service';
  return service.type === 'REPAIR' && service.subcategory
    ? `${main} • ${service.subcategory}` : main;
}

export function serviceLaborLabel(service: { isLaborInclude?: boolean | null }): string {
  return service.isLaborInclude ? 'Labor included in base price' : 'Labor not included in base price';
}

/** Durations are persisted as total minutes so existing records still work. */
export function formatDurationMinutes(value: unknown): string {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function splitDurationMinutes(value: unknown): { hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function combineDurationMinutes(hours: unknown, minutes: unknown): number {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  const m = Math.min(59, Math.max(0, Math.floor(Number(minutes) || 0)));
  return h * 60 + m;
}
