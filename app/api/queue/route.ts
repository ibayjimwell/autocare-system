import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  Database,
} from '@/lib/drizzle';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  ServiceQueue,
} from '@/database/models/queue/service-queue.model';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  Vehicles,
} from '@/database/models/customers/vehicles.model';

import {
  eq,
  and,
} from 'drizzle-orm';

/* ================================================================
   HELPERS
================================================================ */

/**
 * Convert appointment time to a sortable number.
 *
 * Earlier times come first.
 *
 * Examples:
 * 08:00
 * 08:00:00
 */
function getTimeSortValue(
  value: unknown,
): number {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const raw =
    String(
      value,
    ).trim();

  if (
    !raw
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parts =
    raw.split(':');

  const hours =
    Number(
      parts[0],
    );

  const minutes =
    Number(
      parts[1] ||
        0,
    );

  const seconds =
    Number(
      parts[2] ||
        0,
    );

  if (
    !Number.isFinite(
      hours,
    ) ||
    !Number.isFinite(
      minutes,
    ) ||
    !Number.isFinite(
      seconds,
    )
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (
    hours *
      60 *
      60 *
      1000 +
    minutes *
      60 *
      1000 +
    seconds *
      1000
  );
}

/**
 * Convert createdAt into a sortable timestamp.
 *
 * Earlier-created appointments win when appointment times match.
 */
function getCreatedAtSortValue(
  value: unknown,
): number {
  if (
    !value
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp =
    new Date(
      String(
        value,
      ),
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : Number.MAX_SAFE_INTEGER;
}

/* ================================================================
   GET /api/queue?date=YYYY-MM-DD
================================================================ */

export async function GET(
  req: NextRequest,
) {
  const {
    searchParams,
  } =
    new URL(
      req.url,
    );

  const date =
    searchParams.get(
      'date',
    );

  /* ==============================================================
     VALIDATE DATE
  ============================================================== */

  if (
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date,
    )
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Valid date (YYYY-MM-DD) is required.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    /* ============================================================
       FETCH QUEUE

       IMPORTANT:

       Appointments.appointmentDate is now the source of truth.

       ServiceQueue.queueDate is still selected because it is useful
       for diagnostics and synchronization, but it no longer decides
       which date an appointment belongs to.

       This is what prevents a stale queueDate from keeping a
       rescheduled appointment on its previous date.
    ============================================================= */

    const rows =
      await Database
        .select({
          queueId:
            ServiceQueue.id,

          storedQueueNumber:
            ServiceQueue.queueNumber,

          appointmentId:
            ServiceQueue.appointmentId,

          queueStatus:
            ServiceQueue.status,

          storedQueueDate:
            ServiceQueue.queueDate,

          appointmentDate:
            Appointments.appointmentDate,

          appointmentTime:
            Appointments.appointmentTime,

          createdAt:
            Appointments.createdAt,

          updatedAt:
            Appointments.updatedAt,

          status:
            Appointments.status,

          trackingNumber:
            Appointments.trackingNumber,

          customer: {
            id:
              Customers.id,

            fullname:
              Customers.fullname,

            email:
              Customers.email,

            phone:
              Customers.phone,
          },

          vehicle: {
            id:
              Vehicles.id,

            make:
              Vehicles.make,

            model:
              Vehicles.model,

            year:
              Vehicles.year,

            plateNumber:
              Vehicles.plateNumber,
          },

          services:
            Appointments.services,
        })
        .from(
          ServiceQueue,
        )
        .innerJoin(
          Appointments,
          eq(
            ServiceQueue.appointmentId,
            Appointments.id,
          ),
        )
        .innerJoin(
          Customers,
          eq(
            Appointments.customerId,
            Customers.id,
          ),
        )
        .innerJoin(
          Vehicles,
          eq(
            Appointments.vehicleId,
            Vehicles.id,
          ),
        )
        .where(
          and(
            /*
             * APPOINTMENT DATE IS AUTHORITATIVE.
             */
            eq(
              Appointments.appointmentDate,
              date,
            ),

            /*
             * The queue is for confirmed appointments.
             *
             * If your ServiceQueue.status has a more specific
             * semantic in your schema, it is still retained in the
             * response. Appointment status determines whether this
             * appointment belongs to the confirmed service queue.
             */
            eq(
              Appointments.status,
              'CONFIRMED',
            ),
          ),
        );

    /* ============================================================
       SORT QUEUE

       1. Earliest appointment time
       2. Earliest createdAt
       3. Existing stored queueNumber
       4. appointmentId
    ============================================================= */

    const sortedRows =
      [
        ...rows,
      ].sort(
        (
          left,
          right,
        ) => {
          /* ------------------------------------------------------
             PRIMARY: APPOINTMENT TIME
          ------------------------------------------------------- */

          const leftTime =
            getTimeSortValue(
              left.appointmentTime,
            );

          const rightTime =
            getTimeSortValue(
              right.appointmentTime,
            );

          if (
            leftTime !==
            rightTime
          ) {
            return (
              leftTime -
              rightTime
            );
          }

          /* ------------------------------------------------------
             SECONDARY: CREATED AT
          ------------------------------------------------------- */

          const leftCreated =
            getCreatedAtSortValue(
              left.createdAt,
            );

          const rightCreated =
            getCreatedAtSortValue(
              right.createdAt,
            );

          if (
            leftCreated !==
            rightCreated
          ) {
            return (
              leftCreated -
              rightCreated
            );
          }

          /* ------------------------------------------------------
             TERTIARY: STORED QUEUE NUMBER
          ------------------------------------------------------- */

          const leftQueue =
            Number(
              left.storedQueueNumber ??
                Number.MAX_SAFE_INTEGER,
            );

          const rightQueue =
            Number(
              right.storedQueueNumber ??
                Number.MAX_SAFE_INTEGER,
            );

          if (
            leftQueue !==
            rightQueue
          ) {
            return (
              leftQueue -
              rightQueue
            );
          }

          /* ------------------------------------------------------
             FINAL DETERMINISTIC TIE BREAKER
          ------------------------------------------------------- */

          return String(
            left.appointmentId,
          ).localeCompare(
            String(
              right.appointmentId,
            ),
          );
        },
      );

    /* ============================================================
       BUILD EFFECTIVE QUEUE
    ============================================================= */

    const queue =
      sortedRows.map(
        (
          row,
          index,
        ) => ({
          queueId:
            row.queueId,

          appointmentId:
            row.appointmentId,

          /*
           * This is the effective queue position generated from
           * appointment time + createdAt.
           */
          queueNumber:
            index + 1,

          /*
           * Keep the persisted number available for diagnostics.
           */
          storedQueueNumber:
            row.storedQueueNumber,

          queueStatus:
            row.queueStatus,

          /*
           * This is the date the queue is actually using.
           */
          queueDate:
            row.appointmentDate,

          /*
           * Useful for detecting legacy stale queue records.
           */
          storedQueueDate:
            row.storedQueueDate,

          appointmentDate:
            row.appointmentDate,

          appointmentTime:
            row.appointmentTime,

          createdAt:
            row.createdAt,

          updatedAt:
            row.updatedAt,

          status:
            row.status,

          trackingNumber:
            row.trackingNumber,

          customer:
            row.customer,

          vehicle:
            row.vehicle,

          services:
            row.services,
        }),
      );

    /* ============================================================
       RESPONSE
    ============================================================= */

    return NextResponse.json(
      {
        error:
          false,

        message:
          'Queue retrieved.',

        ordering: {
          dateSource:
            'Appointments.appointmentDate',

          primary:
            'appointmentTime',

          secondary:
            'createdAt',

          direction:
            'ascending',
        },

        data:
          queue,
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      '[GET /api/queue] Error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorType:
          'dbe',

        errorTitle:
          'Database error',

        errorMessage:
          'Unable to fetch queue.',

        errorLog:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status: 500,
      },
    );
  }
}