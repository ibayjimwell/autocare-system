import {
  pgEnum,
} from 'drizzle-orm/pg-core';

/* ================================================================
   APPOINTMENT STATUS

   Queue state is intentionally NOT added here.

   ServiceQueue.status handles physical/workshop queue state so the
   appointment lifecycle remains stable.
================================================================ */

export const AppointmentStatusEnum =
  pgEnum(
    'appointment_status',
    [
      'PENDING',
      'CONFIRMED',
      'UNDER_INSPECTION',
      'WAITING_FOR_APPROVAL',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ],
  );
