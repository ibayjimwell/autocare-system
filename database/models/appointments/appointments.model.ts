import { pgTable, pgEnum, uuid, varchar, text, timestamp, date, time } from 'drizzle-orm/pg-core';
import { Customers } from '../customers/customers.model';
import { Vehicles } from '../customers/vehicles.model';
import { AppointmentStatusEnum } from './enum/appointments-status.enum';

export const Appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => Customers.id).notNull(),
  vehicleId: uuid('vehicle_id').references(() => Vehicles.id).notNull(),
  services: text('services').array(), // array of service IDs
  trackingNumber: varchar('tracking_number', { length: 20 }).notNull().unique(),
  appointmentDate: date('appointment_date').notNull(),
  appointmentTime: time('appointment_time').notNull(),
  status: AppointmentStatusEnum('status').default('PENDING').notNull(),
  notes: text('notes'), // optional customer notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
