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

function getManilaDate() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date());
}

/* ================================================================
   POST /api/queue/[appointmentId]/arriving

   Customer directly informs AutoCare that they are arriving today.
================================================================ */

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
  const { appointmentId } =
    await params;

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
      '[arriving] Request read error:',
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

  const customerId =
    typeof body?.customerId ===
    'string'
      ? body.customerId.trim()
      : '';

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
            'Only confirmed appointments can mark arriving.',
        },
        { status: 422 },
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
            'The Arriving action is only available on the appointment date.',
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
      ![
        'PENDING',
        'NOT_ARRIVED',
      ].includes(entry.status)
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            `Arriving cannot be requested while queue status is ${entry.status}.`,
        },
        { status: 422 },
      );
    }

    const now = new Date();

    const [updated] =
      await Database
        .update(ServiceQueue)
        .set({
          status:
            'ARRIVING',
          arrivingAt:
            now,
          arrivalResponseAt:
            now,
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
          'ARRIVING',
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message:
          'Staff has been informed that you are arriving.',
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[POST /api/queue/[appointmentId]/arriving] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to mark the appointment as arriving.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
