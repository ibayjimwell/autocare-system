/*
 * AutoCare Dashboard analytics model.
 *
 * This is a derived read model over the existing AutoCare domain tables.
 * It is intentionally NOT a persisted database table.
 */

export type DashboardModule =
  | 'dashboard'
  | 'customers'
  | 'appointments'
  | 'services'
  | 'staffs'
  | 'serviceTracking'
  | 'payments'
  | 'inventory';

export type DashboardAccess = Record<DashboardModule, boolean>;

export interface DashboardSignal {
  module: Exclude<DashboardModule, 'dashboard'>;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  href: string;
}

export interface DashboardOverview {
  todayAppointments?: number;
  activeServiceJobs?: number;
  waitingForApproval?: number;
  todayPaidAmount?: number;
  unpaidFinalBills?: number;
  lowStockItems?: number;
  onlineStaff?: number;
  signals: DashboardSignal[];
}

export interface DashboardCustomers {
  activeCustomers: number;
  newCustomers30d: number;
  onlineCustomers: number;
  customersWithVisits90d: number;
  repeatCustomerRate90d: number;
}

export interface DashboardAppointmentsDay {
  date: string;
  label: string;
  count: number;
}

export interface DashboardAppointments {
  todayTotal: number;
  todayPending: number;
  todayConfirmed: number;
  todayInService: number;
  next7DaysTotal: number;
  cancellationRate30d: number;
  pendingConfirmation7d: number;
  busiestDay: DashboardAppointmentsDay | null;
  dailyLoad: DashboardAppointmentsDay[];
}

export interface DashboardServiceItem {
  id: string;
  name: string;
  count: number;
}

export interface DashboardServices {
  activeServices: number;
  averageDurationMinutes: number;
  serviceTypeMix: Array<{
    type: string;
    count: number;
  }>;
  topServices90d: DashboardServiceItem[];
}

export interface DashboardStaffs {
  totalStaff: number;
  onlineStaff: number;
  offlineStaff: number;
  modulePresence: Array<{
    module: string;
    count: number;
  }>;
  roleMix: Array<{
    role: string;
    count: number;
  }>;
}

export interface DashboardServiceTracking {
  activeJobs: number;
  jobsUnderInspection: number;
  jobsWaitingApproval: number;
  jobsInProgress: number;
  jobsOlderThan24h: number;
  queueToday: Array<{
    status: string;
    count: number;
  }>;
  inspectionTasks: {
    pending: number;
    inProgress: number;
    done: number;
  };
  workTasks: {
    pending: number;
    inProgress: number;
    done: number;
  };
  oldestJobs: Array<{
    trackingNumber: string;
    customerName: string;
    status: string;
    updatedAt: string;
    ageHours: number;
  }>;
}

export interface DashboardPaymentTrendPoint {
  date: string;
  label: string;
  amount: number;
}

export interface DashboardPayments {
  pendingEstimates: number;
  pendingEstimateValue: number;
  officialFinalBills: number;
  officialFinalBillValue: number;
  paidAmount30d: number;
  paidBills30d: number;
  collectionRate30d: number;
  paymentTrend14d: DashboardPaymentTrendPoint[];
}

export interface DashboardInventoryItem {
  name: string;
  quantity: number;
  reorderLevel: number;
}

export interface DashboardInventory {
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  stockValue: number;
  reservedKeepValue: number;
  usedQuantity30d: number;
  usedValue30d: number;
  lowStockList: DashboardInventoryItem[];
}

export interface DashboardData {
  generatedAt: string;
  access: DashboardAccess;
  overview: DashboardOverview;
  customers?: DashboardCustomers;
  appointments?: DashboardAppointments;
  services?: DashboardServices;
  staffs?: DashboardStaffs;
  serviceTracking?: DashboardServiceTracking;
  payments?: DashboardPayments;
  inventory?: DashboardInventory;
}

/**
 * Builds a client-safe empty read model.
 *
 * The Dashboard route uses this instead of waiting for every analytics query
 * during the App Router navigation. The client fetches the real aggregates
 * after the page shell has mounted.
 */
export function createEmptyDashboardData(
  accessInput: Partial<Record<DashboardModule, boolean>> | null | undefined,
): DashboardData {
  const access: DashboardAccess = {
    dashboard: accessInput?.dashboard === true,
    customers: accessInput?.customers === true,
    appointments: accessInput?.appointments === true,
    services: accessInput?.services === true,
    staffs: accessInput?.staffs === true,
    serviceTracking: accessInput?.serviceTracking === true,
    payments: accessInput?.payments === true,
    inventory: accessInput?.inventory === true,
  };

  return {
    generatedAt: '',
    access,
    overview: {
      signals: [],
    },
  };
}
