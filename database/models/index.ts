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
export * from "./service-tracking/inspection-tasks.model";
export * from "./service-tracking/inspection-findings.model";
export * from "./service-tracking/inspection-finding-parts.model";
export * from "./service-tracking/work-tasks.model";

// Billing
export * from "./payments/estimated-costs.model";
export * from "./payments/estimate-findings.model";
export * from "./payments/estimate-finding-parts.model";
export * from "./payments/estimate-fees.model";
export * from "./payments/estimate-discounts.model";

export * from "./payments/final-bill.model";
export * from "./payments/final-bill-findings.model";
export * from "./payments/final-bill-finding-parts.model";
export * from "./payments/final-bill-fees.model";
export * from "./payments/final-bill-discounts.model";
export * from "./payments/final-bill-work-tasks.model";

export * from "./payments/receipts.model";

// Inventory
export * from "./inventory/inventory.model";
export * from "./inventory/pos-transaction.model";