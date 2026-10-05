export const DASHBOARD_MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
  services: 'Services',
  staffs: 'Staffs',
  serviceTracking: 'Service Tracking',
  payments: 'Payments',
  inventory: 'Inventory',
};

export const DASHBOARD_MODULE_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  customers: '/customers',
  appointments: '/appointments',
  services: '/services',
  staffs: '/staffs',
  serviceTracking: '/service-tracking',
  payments: '/payments',
  inventory: '/inventory',
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-PH').format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatPercent(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

export function formatDurationMinutes(value: number): string {
  const minutes = Math.max(0, Math.round(value || 0));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${hours}h ${remainder}m`;
}

export function formatRelativeAge(hours: number): string {
  const value = Math.max(0, Math.round(hours || 0));
  if (value < 24) return `${value}h old`;

  const days = Math.floor(value / 24);
  const remainder = value % 24;
  if (remainder === 0) return `${days}d old`;
  return `${days}d ${remainder}h old`;
}

export function formatShortDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getTodayLabel(): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}
