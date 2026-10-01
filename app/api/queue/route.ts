import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  Database,
} from '@/lib/drizzle';

import {
  ServiceQueue,
} from '@/database/models/queue/service-queue.model';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  Vehicles,
} from '@/database/models/customers/vehicles.model';

import {
  and,
  eq,
  inArray,
} from 'drizzle-orm';

/* ================================================================
   APPOINTMENT STATUSES THAT HAVE A QUEUE RECORD
================================================================ */

const QUEUED_APPOINTMENT_STATUSES = [
  'CONFIRMED',
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

const CONFIRMED_QUEUE_STATUSES = [
  'PENDING',
  'ARRIVING',
  'ARRIVED',
  'NOT_ARRIVED',
] as const;

const WORK_QUEUE_STATUSES = [
  'PENDING',
  'WORKING',
] as const;

type QueueMode =
  | 'CONFIRMED'
  | 'IN_PROGRESS';

/* ================================================================
   HELPERS
================================================================ */

function getTimeSortValue(
  value: unknown,
): number {
  const raw = String(
    value ?? '',
  ).trim();

  if (!raw) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parts =
    raw.split(':');

  const hours = Number(
    parts[0],
  );

  const minutes = Number(
    parts[1] || 0,
  );

  const seconds = Number(
    parts[2] || 0,
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
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000 +
    seconds * 1000
  );
}

function getTimestamp(
  value: unknown,
): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp =
    new Date(
      String(value),
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : Number.MAX_SAFE_INTEGER;
}

function getPhase(
  appointmentStatus: string,
):
  | 'CONFIRMED'
  | 'INSPECTION'
  | 'APPROVAL'
  | 'IN_PROGRESS'
  | 'COMPLETED' {
  switch (
    appointmentStatus
  ) {
    case 'CONFIRMED':
      return 'CONFIRMED';

    case 'UNDER_INSPECTION':
      return 'INSPECTION';

    case 'WAITING_FOR_APPROVAL':
      return 'APPROVAL';

    case 'IN_PROGRESS':
      return 'IN_PROGRESS';

    case 'COMPLETED':
      return 'COMPLETED';

    default:
      return 'CONFIRMED';
  }
}

function normalizeEffectiveQueueStatus(
  row: any,
): string {
  const appointmentStatus =
    String(
      row.status ?? '',
    ).toUpperCase();

  const storedQueueStatus =
    String(
      row.queueStatus ?? '',
    ).toUpperCase();

  /*
   * The appointment status is authoritative for lifecycle placement.
   * A stale ServiceQueue.status must not make a CONFIRMED appointment
   * display as INSPECTING/WORKING.
   */
  if (
    appointmentStatus ===
    'CONFIRMED'
  ) {
    return CONFIRMED_QUEUE_STATUSES.includes(
      storedQueueStatus as any,
    )
      ? storedQueueStatus
      : 'PENDING';
  }

  if (
    appointmentStatus ===
    'IN_PROGRESS'
  ) {
    return WORK_QUEUE_STATUSES.includes(
      storedQueueStatus as any,
    )
      ? storedQueueStatus
      : 'PENDING';
  }

  return storedQueueStatus;
}

function isConfirmedInLine(
  row: any,
): boolean {
  return (
    row.status ===
      'CONFIRMED' &&
    CONFIRMED_QUEUE_STATUSES.includes(
      row.queueStatus,
    )
  );
}

function isWorkInLine(
  row: any,
): boolean {
  return (
    row.status ===
      'IN_PROGRESS' &&
    WORK_QUEUE_STATUSES.includes(
      row.queueStatus,
    )
  );
}

function compareConfirmed(
  left: any,
  right: any,
): number {
  const priority: Record<
    string,
    number
  > = {
    ARRIVED: 0,
    ARRIVING: 1,
    PENDING: 2,
    NOT_ARRIVED: 3,
  };

  const statusDifference =
    (priority[
      left.queueStatus
    ] ?? 99) -
    (priority[
      right.queueStatus
    ] ?? 99);

  if (
    statusDifference !== 0
  ) {
    return statusDifference;
  }

  if (
    left.queueStatus ===
    'ARRIVED'
  ) {
    const arrivalDifference =
      getTimestamp(
        left.arrivedAt,
      ) -
      getTimestamp(
        right.arrivedAt,
      );

    if (
      arrivalDifference !==
      0
    ) {
      return arrivalDifference;
    }
  }

  if (
    left.queueStatus ===
    'ARRIVING'
  ) {
    const arrivingDifference =
      getTimestamp(
        left.arrivingAt,
      ) -
      getTimestamp(
        right.arrivingAt,
      );

    if (
      arrivingDifference !==
      0
    ) {
      return arrivingDifference;
    }
  }

  const appointmentTimeDifference =
    getTimeSortValue(
      left.appointmentTime,
    ) -
    getTimeSortValue(
      right.appointmentTime,
    );

  if (
    appointmentTimeDifference !==
    0
  ) {
    return appointmentTimeDifference;
  }

  const createdDifference =
    getTimestamp(
      left.createdAt,
    ) -
    getTimestamp(
      right.createdAt,
    );

  if (
    createdDifference !==
    0
  ) {
    return createdDifference;
  }

  return String(
    left.appointmentId,
  ).localeCompare(
    String(
      right.appointmentId,
    ),
  );
}

function compareWork(
  left: any,
  right: any,
): number {
  /*
   * IN_PROGRESS queue order remains compatible with the existing
   * behavior:
   *
   *   PENDING before WORKING
   *   ServiceQueue.updatedAt ASC within the same state
   *   Appointments.updatedAt ASC fallback
   *   createdAt ASC deterministic fallback
   *
   * The important change is that this comparison is now applied to
   * every IN_PROGRESS appointment, regardless of appointment date.
   */
  const statusPriority: Record<
    string,
    number
  > = {
    PENDING: 0,
    WORKING: 1,
  };

  const statusDifference =
    (statusPriority[
      left.queueStatus
    ] ?? 99) -
    (statusPriority[
      right.queueStatus
    ] ?? 99);

  if (
    statusDifference !== 0
  ) {
    return statusDifference;
  }

  const queueUpdatedDifference =
    getTimestamp(
      left.queueUpdatedAt,
    ) -
    getTimestamp(
      right.queueUpdatedAt,
    );

  if (
    queueUpdatedDifference !==
    0
  ) {
    return queueUpdatedDifference;
  }

  const appointmentUpdatedDifference =
    getTimestamp(
      left.updatedAt,
    ) -
    getTimestamp(
      right.updatedAt,
    );

  if (
    appointmentUpdatedDifference !==
    0
  ) {
    return appointmentUpdatedDifference;
  }

  const createdDifference =
    getTimestamp(
      left.createdAt,
    ) -
    getTimestamp(
      right.createdAt,
    );

  if (
    createdDifference !==
    0
  ) {
    return createdDifference;
  }

  return String(
    left.appointmentId,
  ).localeCompare(
    String(
      right.appointmentId,
    ),
  );
}

/* ================================================================
   GET /api/queue

   CONFIRMED MODE
     GET /api/queue?mode=CONFIRMED&date=YYYY-MM-DD

   IN_PROGRESS MODE
     GET /api/queue?mode=IN_PROGRESS

   IN_PROGRESS mode deliberately does not apply appointmentDate.
================================================================ */

export async function GET(
  req: NextRequest,
) {
  const searchParams =
    new URL(
      req.url,
    ).searchParams;

  const requestedMode =
    String(
      searchParams.get(
        'mode',
      ) ??
        'CONFIRMED',
    )
      .trim()
      .toUpperCase();

  const mode: QueueMode =
    requestedMode ===
    'IN_PROGRESS'
      ? 'IN_PROGRESS'
      : 'CONFIRMED';

  const date =
    searchParams.get(
      'date',
    );

  if (
    mode ===
      'CONFIRMED' &&
    (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date,
      )
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Valid date (YYYY-MM-DD) is required for the confirmed queue.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    /* ============================================================
       MAIN QUEUE QUERY
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

          arrivalRequestAt:
            ServiceQueue.arrivalRequestAt,

          arrivalResponseAt:
            ServiceQueue.arrivalResponseAt,

          arrivingAt:
            ServiceQueue.arrivingAt,

          arrivedAt:
            ServiceQueue.arrivedAt,

          workingAt:
            ServiceQueue.workingAt,

          queueUpdatedAt:
            ServiceQueue.updatedAt,

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

          services:
            Appointments.services,

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
        .leftJoin(
          Customers,
          eq(
            Appointments.customerId,
            Customers.id,
          ),
        )
        .leftJoin(
          Vehicles,
          eq(
            Appointments.vehicleId,
            Vehicles.id,
          ),
        )
        .where(
          mode ===
            'IN_PROGRESS'
            ? eq(
                Appointments.status,
                'IN_PROGRESS',
              )
            : and(
                eq(
                  Appointments.appointmentDate,
                  date!,
                ),

                inArray(
                  Appointments.status,
                  [
                    ...QUEUED_APPOINTMENT_STATUSES,
                  ],
                ),
              ),
        );

    /* ============================================================
       LEGACY IN_PROGRESS APPOINTMENTS WITHOUT A QUEUE ROW

       Some older appointments may already be IN_PROGRESS but have no
       persisted service_queue row. They must still appear in the
       all-dates In Progress tab.

       These records are represented as a temporary PENDING queue row.
       Clicking Work This will create/synchronize the persisted queue
       row through the existing status endpoint.
    ============================================================= */

    const existingQueueAppointmentIds =
      new Set(
        rows.map(
          row =>
            String(
              row.appointmentId,
            ),
        ),
      );

    const missingInProgressAppointments =
      mode ===
      'IN_PROGRESS'
        ? await Database
            .select({
              appointmentId:
                Appointments.id,

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

              services:
                Appointments.services,

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
            })
            .from(
              Appointments,
            )
            .leftJoin(
              Customers,
              eq(
                Appointments.customerId,
                Customers.id,
              ),
            )
            .leftJoin(
              Vehicles,
              eq(
                Appointments.vehicleId,
                Vehicles.id,
              ),
            )
            .where(
              eq(
                Appointments.status,
                'IN_PROGRESS',
              ),
            )
        : [];

    const syntheticInProgressRows =
      missingInProgressAppointments
        .filter(
          row =>
            !existingQueueAppointmentIds.has(
              String(
                row.appointmentId,
              ),
            ),
        )
        .map(
          row => ({
            queueId:
              `virtual-${row.appointmentId}`,

            storedQueueNumber:
              null,

            appointmentId:
              row.appointmentId,

            queueStatus:
              'PENDING',

            storedQueueDate:
              row.appointmentDate,

            arrivalRequestAt:
              null,

            arrivalResponseAt:
              null,

            arrivingAt:
              null,

            arrivedAt:
              null,

            workingAt:
              null,

            queueUpdatedAt:
              row.updatedAt,

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

            services:
              row.services,

            customer:
              row.customer,

            vehicle:
              row.vehicle,
          }),
        );

    const allRows = [
      ...rows,
      ...syntheticInProgressRows,
    ];

    /* ============================================================
       NORMALIZE EFFECTIVE QUEUE STATUS
    ============================================================= */

    const normalizedRows =
      allRows.map(
        row => {
          const effectiveQueueStatus =
            normalizeEffectiveQueueStatus(
              row,
            );

          return {
            ...row,

            queueStatus:
              effectiveQueueStatus,

            phase:
              getPhase(
                row.status,
              ),
          };
        },
      );

    /* ============================================================
       ACTIVE LINES
    ============================================================= */

    const confirmedLine =
      normalizedRows
        .filter(
          isConfirmedInLine,
        )
        .sort(
          compareConfirmed,
        );

    const workLine =
      normalizedRows
        .filter(
          isWorkInLine,
        )
        .sort(
          compareWork,
        );

    const confirmedPositions =
      new Map(
        confirmedLine.map(
          (
            row,
            index,
          ) => [
            row.queueId,
            index + 1,
          ],
        ),
      );

    const workPositions =
      new Map(
        workLine.map(
          (
            row,
            index,
          ) => [
            row.queueId,
            index + 1,
          ],
        ),
      );

    /* ============================================================
       RESPONSE RECORDS
    ============================================================= */

    const data =
      normalizedRows
        .map(
          row => {
            const confirmedInLine =
              isConfirmedInLine(
                row,
              );

            const workInLine =
              isWorkInLine(
                row,
              );

            const inLine =
              confirmedInLine ||
              workInLine;

            let queueNumber:
              | number
              | null = null;

            let queueType:
              | 'CONFIRMED'
              | 'IN_PROGRESS'
              | null = null;

            if (
              confirmedInLine
            ) {
              queueNumber =
                confirmedPositions.get(
                  row.queueId,
                ) ?? null;

              queueType =
                'CONFIRMED';
            } else if (
              workInLine
            ) {
              queueNumber =
                workPositions.get(
                  row.queueId,
                ) ?? null;

              queueType =
                'IN_PROGRESS';
            } else if (
              row.status ===
              'CONFIRMED'
            ) {
              queueType =
                'CONFIRMED';
            } else if (
              row.status ===
              'IN_PROGRESS'
            ) {
              queueType =
                'IN_PROGRESS';
            }

            return {
              ...row,

              queueNumber,

              queueType,

              inLine,

              linePosition:
                queueNumber,

              lineTotal:
                queueType ===
                'CONFIRMED'
                  ? confirmedLine.length
                  : queueType ===
                      'IN_PROGRESS'
                    ? workLine.length
                    : null,
            };
          },
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (
              left.inLine &&
              !right.inLine
            ) {
              return -1;
            }

            if (
              !left.inLine &&
              right.inLine
            ) {
              return 1;
            }

            const phaseOrder: Record<
              string,
              number
            > = {
              CONFIRMED: 0,
              INSPECTION: 1,
              APPROVAL: 2,
              IN_PROGRESS: 3,
              COMPLETED: 4,
            };

            const phaseDifference =
              (phaseOrder[
                left.phase
              ] ?? 99) -
              (phaseOrder[
                right.phase
              ] ?? 99);

            if (
              phaseDifference !==
              0
            ) {
              return phaseDifference;
            }

            if (
              left.queueType ===
                'CONFIRMED' &&
              right.queueType ===
                'CONFIRMED'
            ) {
              return compareConfirmed(
                left,
                right,
              );
            }

            if (
              left.queueType ===
                'IN_PROGRESS' &&
              right.queueType ===
                'IN_PROGRESS'
            ) {
              return compareWork(
                left,
                right,
              );
            }

            return String(
              left.appointmentId,
            ).localeCompare(
              String(
                right.appointmentId,
              ),
            );
          },
        );

    return NextResponse.json(
      {
        error:
          false,

        message:
          mode ===
          'IN_PROGRESS'
            ? 'All in-progress appointments retrieved.'
            : 'Queue retrieved.',

        data,

        ordering: {
          source:
            mode ===
            'IN_PROGRESS'
              ? 'Appointments.status = IN_PROGRESS; appointmentDate is intentionally not used as a filter.'
              : 'Appointments.appointmentDate',

          inProgressDate:
            'All appointment dates',

          confirmed: [
            'ARRIVED by arrivedAt ASC',
            'ARRIVING by arrivingAt ASC',
            'PENDING by appointmentTime ASC then createdAt ASC',
            'NOT_ARRIVED by appointmentTime ASC then createdAt ASC',
          ],

          inProgress: [
            'PENDING before WORKING',
            'same queue state by ServiceQueue.updatedAt ASC',
            'Appointments.updatedAt ASC as fallback',
            'createdAt ASC then appointmentId ASC as deterministic tie-breakers',
          ],
        },
      },
      {
        status:
          200,
      },
    );
  } catch (error) {
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
            : String(error),
      },
      {
        status:
          500,
      },
    );
  }
}