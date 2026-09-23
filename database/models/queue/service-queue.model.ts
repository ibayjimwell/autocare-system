import {
  pgTable,
  uuid,
  integer,
  date,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';

import {
  Appointments,
} from '../appointments/appointments.model';

export const ServiceQueue = pgTable(
  'service_queue',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    appointmentId: uuid('appointment_id')
      .references(
        () => Appointments.id,
        {
          onDelete: 'cascade',
        },
      )
      .notNull(),

    queueDate: date('queue_date')
      .notNull(),

    queueNumber: integer('queue_number')
      .notNull(),

    /*
     * Queue state is separate from Appointment.status.
     *
     * Confirmed flow:
     *   PENDING -> ARRIVING -> ARRIVED / NOT_ARRIVED
     *
     * Inspection:
     *   INSPECTING
     *
     * Work flow:
     *   PENDING -> WORKING
     *
     * History:
     *   COMPLETED
     */
    status: text('status')
      .default('PENDING')
      .notNull(),

    /*
     * Customer/staff arrival communication timestamps.
     */
    arrivalRequestAt: timestamp(
      'arrival_request_at',
    ),

    arrivalResponseAt: timestamp(
      'arrival_response_at',
    ),

    arrivingAt: timestamp(
      'arriving_at',
    ),

    arrivedAt: timestamp(
      'arrived_at',
    ),

    /*
     * Timestamp for the active mechanic work state.
     */
    workingAt: timestamp(
      'working_at',
    ),

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
);
