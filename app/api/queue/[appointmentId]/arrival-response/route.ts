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

export async function POST(
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
      '[arrival-response] Request read error:',
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

  const response =
    typeof body?.response ===
    'string'
      ? body.response
          .trim()
          .toUpperCase()
      : '';

  const customerId =
    typeof body?.customerId ===
    'string'
      ? body.customerId.trim()
      : '';

  if (
    !['YES', 'NO'].includes(
      response,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'response must be YES or NO.',
      },
      { status: 422 },
    );
  }

  if (
    !isValidUUID(customerId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Valid customerId is required.',
      },
      { status: 400 },
    );
  }

  try {
    const [appointment] =
      await Database
        .select()
        .from(Appointments)
        .where(
          and(
            eq(
              Appointments.id,
              appointmentId,
            ),
            eq(
              Appointments.customerId,
              customerId,
            ),
          ),
        )
        .limit(1);

    if (!appointment) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Appointment does not belong to this customer.',
        },
        { status: 403 },
      );
    }

    if (
      appointment.status !==
      'CONFIRMED'
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'This appointment is no longer confirmed.',
        },
        { status: 422 },
      );
    }

    const [entry] =
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

    if (
      !entry.arrivalRequestAt
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'There is no pending arrival question for this appointment.',
        },
        { status: 409 },
      );
    }

    if (
      entry.arrivalResponseAt &&
      new Date(
        String(
          entry.arrivalResponseAt,
        ),
      ).getTime() >=
        new Date(
          String(
            entry.arrivalRequestAt,
          ),
        ).getTime()
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'This arrival question has already been answered.',
        },
        { status: 409 },
      );
    }

    const storedStatus =
      String(
        entry.status,
      ).toUpperCase();

    if (
      ![
        'PENDING',
        'NOT_ARRIVED',
      ].includes(
        storedStatus,
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            `Arrival response cannot be applied to queue status ${entry.status}.`,
        },
        { status: 422 },
      );
    }

    const now =
      new Date();

    const nextStatus =
      response === 'YES'
        ? 'ARRIVING'
        : 'NOT_ARRIVED';

    const [updated] =
      await Database
        .update(
          ServiceQueue,
        )
        .set({
          status:
            nextStatus,
          arrivalResponseAt:
            now,
          arrivingAt:
            response === 'YES'
              ? now
              : null,
          arrivedAt:
            null,
          updatedAt:
            now,
          queueDate:
            appointment.appointmentDate,
        })
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
            'Queue changed by another user. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    serviceQueueTriggers
      .onCustomerArriving({
        trackingNumber:
          appointment.trackingNumber,
        customerName:
          'Customer',
        arrivalStatus:
          nextStatus,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message:
          response === 'YES'
            ? 'Arrival confirmed.'
            : 'Marked as not arrived. Consider requesting a new schedule with AutoCare.',
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[POST /api/queue/[appointmentId]/arrival-response] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to save arrival response.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
