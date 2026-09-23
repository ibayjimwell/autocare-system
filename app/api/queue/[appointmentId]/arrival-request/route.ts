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
  eq,
  and,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  mobileServiceQueueTriggers,
} from '@/triggers/service-queue';

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

/* ================================================================
   POST /api/queue/[appointmentId]/arrival-request

   Staff asks the customer:
     "Are you arriving today?"

   The queue status itself remains PENDING or NOT_ARRIVED until the
   customer answers.
================================================================ */

export async function POST(
  _req: NextRequest,
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

  try {
    const [appointment] =
      await Database
        .select({
          id:
            Appointments.id,
          customerId:
            Appointments.customerId,
          customerName:
            Customers.fullname,
          status:
            Appointments.status,
          appointmentDate:
            Appointments.appointmentDate,
          trackingNumber:
            Appointments.trackingNumber,
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
      appointment.status !==
      'CONFIRMED'
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Arrival can only be requested for a confirmed appointment.',
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
            'Arrival questions can only be sent for today\'s appointment.',
        },
        { status: 422 },
      );
    }

    const [entry] =
      await Database
        .select()
        .from(
          ServiceQueue,
        )
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

    const effectiveQueueStatus = [
      'PENDING',
      'NOT_ARRIVED',
    ].includes(
      String(
        entry.status,
      ).toUpperCase(),
    )
      ? String(
          entry.status,
        ).toUpperCase()
      : 'PENDING';

    const now =
      new Date();

    const [updated] =
      await Database
        .update(
          ServiceQueue,
        )
        .set({
          status:
            effectiveQueueStatus,
          arrivalRequestAt:
            now,
          arrivalResponseAt:
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
            'Queue entry changed by another user. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    mobileServiceQueueTriggers
      .onArrivalQuestion({
        appointmentId,
        customerId:
          appointment.customerId,
        trackingNumber:
          appointment.trackingNumber,
        customerName:
          appointment.customerName ||
          'Customer',
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message:
          'Arrival question sent to the customer.',
        data: {
          appointmentId,
          queueStatus:
            updated.status,
          arrivalRequestAt:
            updated.arrivalRequestAt,
          arrivalResponseAt:
            updated.arrivalResponseAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[POST /api/queue/[appointmentId]/arrival-request] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to send arrival request.',
        errorLog:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}
