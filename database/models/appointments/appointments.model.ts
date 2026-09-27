import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  time,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import {
  sql,
} from 'drizzle-orm';

import {
  Customers,
} from '../customers/customers.model';

import {
  Vehicles,
} from '../customers/vehicles.model';

import {
  AppointmentStatusEnum,
} from './enum/appointments-status.enum';

export const Appointments = pgTable(
  'appointments',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    customerId: uuid('customer_id')
      .references(
        () => Customers.id,
      )
      .notNull(),

    vehicleId: uuid('vehicle_id')
      .references(
        () => Vehicles.id,
      )
      .notNull(),

    services: text('services').array(),

    trackingNumber: varchar(
      'tracking_number',
      { length: 20 },
    )
      .notNull()
      .unique(),

    appointmentDate: date(
      'appointment_date',
    ).notNull(),

    appointmentTime: time(
      'appointment_time',
    ).notNull(),

    status: AppointmentStatusEnum(
      'status',
    )
      .default('PENDING')
      .notNull(),

    notes: text('notes'),

    createdAt: timestamp(
      'created_at',
    )
      .defaultNow()
      .notNull(),

    updatedAt: timestamp(
      'updated_at',
    )
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    customerVehicleDateUnique: uniqueIndex(
      'appointments_customer_vehicle_date_active_uidx',
    )
      .on(
        table.customerId,
        table.vehicleId,
        table.appointmentDate,
      )
      .where(sql`${table.status} <> 'CANCELLED'`),
  }),
);
