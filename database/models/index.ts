// Models

// Staffs
export * from "./staffs/staffs.model";
export * from "./staffs/staff-access.model";

// Customers
export * from "./customers/customers.model";
export * from "./customers/vehicles.model";

// Services
export * from "./services/services.model";

// Appointments
export * from "./appointments/appointments.model";
export * from "./appointments/appointments-status-history.model";
export * from "./appointments/enum/appointments-status.enum";

// Service Tracking
export * from './inventory/inventory.model';
export * from './service-tracking/inspection-tasks.model';
export * from './service-tracking/inspection-findings.model';
export * from './service-tracking/inspection-finding-parts.model';
export * from './service-tracking/work-tasks.model';

// Billing
export * from './billing/estimated-costs.model';
export * from './billing/estimate-findings.model';
export * from './billing/estimate-finding-parts.model';
export * from './billing/estimate-fees.model';
export * from './billing/estimate-discounts.model';

export * from './billing/final-bill.model';
export * from './billing/final-bill-findings.model';
export * from './billing/final-bill-finding-parts.model';
export * from './billing/final-bill-fees.model';
export * from './billing/final-bill-discounts.model';
export * from './billing/final-bill-work-tasks.model';
