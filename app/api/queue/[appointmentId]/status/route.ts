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
  eq,
  and,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  serviceQueueTriggers,
} from '@/triggers/service-queue';

const VALID_STATUSES = [
  'PENDING',
  'ARRIVING',
  'ARRIVED',
  'NOT_ARRIVED',
  'INSPECTING',
  'WORKING',
  'COMPLETED',
] as const;

type QueueStatus =
  (typeof VALID_STATUSES)[number];

function getManilaDate() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date());
}

function statusAllowed(
  appointmentStatus: string,
  currentQueueStatus: string,
  requestedStatus: QueueStatus,
) {
  if (
    requestedStatus ===
    'ARRIVED'
  ) {
    return (
      appointmentStatus ===
        'CONFIRMED' &&
      [
        'PENDING',
        'ARRIVING',
        'NOT_ARRIVED',
      ].includes(
        currentQueueStatus,
      )
    );
  }

  if (
    requestedStatus ===
    'ARRIVING'
  ) {
    return (
      appointmentStatus ===
        'CONFIRMED' &&
      [
        'PENDING',
        'NOT_ARRIVED',
      ].includes(
        currentQueueStatus,
      )
    );
  }

  if (
    requestedStatus ===
    'NOT_ARRIVED'
  ) {
    return (
      appointmentStatus ===
        'CONFIRMED' &&
      [
        'PENDING',
        'ARRIVING',
      ].includes(
        currentQueueStatus,
      )
    );
  }

  if (
    requestedStatus ===
    'INSPECTING'
  ) {
    return (
      [
        'UNDER_INSPECTION',
        'WAITING_FOR_APPROVAL',
      ].includes(
        appointmentStatus,
      ) &&
      currentQueueStatus !==
        'COMPLETED'
    );
  }

  if (
    requestedStatus ===
    'WORKING'
  ) {
    return (
      appointmentStatus ===
        'IN_PROGRESS' &&
      currentQueueStatus ===
        'PENDING'
    );
  }

  if (
    requestedStatus ===
    'PENDING'
  ) {
    return (
      appointmentStatus ===
        'IN_PROGRESS' &&
      currentQueueStatus ===
        'WORKING'
    );
  }

  if (
    requestedStatus ===
    'COMPLETED'
  ) {
    return (
      appointmentStatus ===
      'COMPLETED'
    );
  }

  return false;
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      appointmentId: string;
    }>;
  },
) {
  const {
    appointmentId,
  } = await params;

  if (
    !isValidUUID(
      appointmentId,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid appointment ID.',
      },
      { status: 400 },
    );
  }

  let body: any;

  try {
    const raw =
      await req.text();

    if (!raw.trim()) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Request body is required.',
        },
        { status: 400 },
      );
    }

    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Invalid JSON.',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error(
      '[queue/status] Request read error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to read request body.',
      },
      { status: 400 },
    );
  }

  const requestedStatus =
    typeof body?.status ===
    'string'
      ? body.status
          .trim()
          .toUpperCase()
      : '';

  if (
    !(
      VALID_STATUSES as readonly string[]
    ).includes(
      requestedStatus,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          `Invalid queue status. Allowed: ${VALID_STATUSES.join(', ')}.`,
      },
      { status: 422 },
    );
  }

  try {
    const [appointment] =
      await Database
        .select()
        .from(Appointments)
        .where(
          eq(
            Appointments.id,
            appointmentId,
          ),
        )
        .limit(1);

    if (!appointment) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Appointment not found.',
        },
        { status: 404 },
      );
    }

    if (
      appointment.appointmentDate !==
      getManilaDate()
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Queue actions are available only for today\'s appointments.',
        },
        { status: 422 },
      );
    }

    let [entry] =
      await Database
        .select()
        .from(ServiceQueue)
        .where(
          eq(
            ServiceQueue.appointmentId,
            appointmentId,
          ),
        )
        .limit(1);

    /*
     * Some existing IN_PROGRESS appointments were created before the
     * dedicated work queue existed and therefore have no ServiceQueue row.
     * Create the work-queue entry lazily when Work This is pressed.
     *
     * The GET /api/queue route also exposes these appointments as virtual
     * PENDING entries so they are visible before this action occurs.
     */
    if (!entry) {
      if (
        appointment.status ===
          'IN_PROGRESS' &&
        [
          'PENDING',
          'WORKING',
        ].includes(
          requestedStatus,
        )
      ) {
        const now =
          new Date();

        const [createdEntry] =
          await Database
            .insert(ServiceQueue)
            .values({
              appointmentId,
              queueDate:
                appointment.appointmentDate,
              queueNumber: 1,
              status: 'PENDING',
              createdAt: now,
              updatedAt: now,
            })
            .returning();

        entry =
          createdEntry ??
          null;
      }

      if (!entry) {
        return NextResponse.json(
          {
            error: true,
            errorMessage:
              'Queue entry not found.',
          },
          { status: 404 },
        );
      }
    }

    let currentQueueStatus =
      entry.status;

    /*
     * Prevent stale queue states from blocking arrival actions for a
     * still-CONFIRMED appointment.
     */
    if (
      appointment.status ===
      'CONFIRMED' &&
      ![
        'PENDING',
        'ARRIVING',
        'ARRIVED',
        'NOT_ARRIVED',
      ].includes(
        currentQueueStatus,
      )
    ) {
      currentQueueStatus =
        'PENDING';
    }

    if (
      currentQueueStatus ===
      requestedStatus
    ) {
      return NextResponse.json(
        {
          error: false,
          message:
            'Queue status is already set.',
          data: {
            ...entry,
            status:
              currentQueueStatus,
          },
        },
        { status: 200 },
      );
    }

    if (
      !statusAllowed(
        appointment.status,
        currentQueueStatus,
        requestedStatus as QueueStatus,
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            `Cannot change queue status from ${currentQueueStatus} to ${requestedStatus} while appointment is ${appointment.status}.`,
        },
        { status: 422 },
      );
    }

    const now =
      new Date();

    const updates: any = {
      status:
        requestedStatus,
      queueDate:
        appointment.appointmentDate,
      updatedAt: now,
    };

    if (
      requestedStatus ===
      'ARRIVING'
    ) {
      updates.arrivingAt =
        now;
      updates.arrivalResponseAt =
        now;
    }

    if (
      requestedStatus ===
      'ARRIVED'
    ) {
      updates.arrivedAt =
        now;
      updates.arrivalResponseAt =
        now;
      updates.arrivingAt =
        entry.arrivingAt ??
        now;
    }

    if (
      requestedStatus ===
      'NOT_ARRIVED'
    ) {
      updates.arrivalResponseAt =
        now;
      updates.arrivingAt =
        null;
      updates.arrivedAt =
        null;
    }

    if (
      requestedStatus ===
      'WORKING'
    ) {
      updates.workingAt =
        now;
    }

    if (
      requestedStatus ===
        'PENDING' &&
      appointment.status ===
        'IN_PROGRESS'
    ) {
      updates.workingAt =
        null;
    }

    if (
      requestedStatus ===
      'INSPECTING'
    ) {
      updates.workingAt =
        null;
    }

    if (
      requestedStatus ===
      'COMPLETED'
    ) {
      updates.workingAt =
        entry.workingAt;
    }

    const [updated] =
      await Database
        .update(
          ServiceQueue,
        )
        .set(updates)
        .where(
          and(
            eq(
              ServiceQueue.id,
              entry.id,
            ),
            eq(
              ServiceQueue.status,
              entry.status,
            ),
          ),
        )
        .returning();

    if (!updated) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Queue entry changed by another user. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    if (
      requestedStatus ===
        'ARRIVED' ||
      requestedStatus ===
        'ARRIVING' ||
      requestedStatus ===
        'NOT_ARRIVED'
    ) {
      serviceQueueTriggers
        .onCustomerArriving({
          trackingNumber:
            appointment.trackingNumber,
          customerName:
            'Customer',
          arrivalStatus:
            requestedStatus as
              | 'ARRIVING'
              | 'ARRIVED'
              | 'NOT_ARRIVED',
        })
        .catch(console.error);
    }

    return NextResponse.json(
      {
        error: false,
        message:
          `Queue status updated to ${requestedStatus}.`,
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[PATCH /api/queue/[appointmentId]/status] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorMessage:
          'Unable to update queue status.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
