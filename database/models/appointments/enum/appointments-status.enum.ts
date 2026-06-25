import { pgEnum } from 'drizzle-orm/pg-core';

export const AppointmentStatusEnum = pgEnum('appointment_status', [
  'PENDING',
  'CONFIRMED',
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);