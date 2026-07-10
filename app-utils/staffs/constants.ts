export const MODULES = [
  'dashboard',
  'customers',
  'appointments',
  'services',
  'staffs',
  'serviceTracking',
  'payments',
  'inventory',
] as const;

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  appointments: 'Appointments',
  services: 'Services',
  staffs: 'Staffs',
  serviceTracking: 'Service Tracking',
  payments: 'Payments',
  inventory: 'Inventory',
};

export const PREDEFINED_ROLES = ['Admin', 'Mechanic', 'Assistant', 'Cashier'];

export type SortField = 'fullname' | 'username' | 'role' | 'status' | 'accessCount' | 'currentModule';