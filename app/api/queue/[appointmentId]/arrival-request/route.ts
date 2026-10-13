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

import { eq, and, isNull } from 'drizzle-orm';

import { isValidUUID } from '@/utils/shared';
import { canManageArrival } from '@/lib/queue/arrival-auth';
import { Vehicles } from '@/database/models/customers/vehicles.model';

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
    if (!(await canManageArrival())) {
      return NextResponse.json({ error: true, errorMessage: 'Service Tracking permission required.' }, { status: 403 });
    }
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
          trackingNumber: Appointments.trackingNumber,
          vehicleMake: Vehicles.make,
          vehicleModel: Vehicles.model,
          vehicleYear: Vehicles.year,
          plateNumber: Vehicles.plateNumber,
        })
        .from(
          Appointments,
        )
        .leftJoin(Customers, eq(Appointments.customerId, Customers.id))
        .leftJoin(Vehicles, eq(Appointments.vehicleId, Vehicles.id))
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

    /*
     * An arrival question is a queued database request, not an online
     * presence check. Push can be delivered while the app is closed, and
     * the pending request is retrieved whenever the customer comes back.
     *
     * The confirmed-queue GET endpoint normalizes stale legacy queue
     * statuses (such as INSPECTING or WORKING) to PENDING. Normalize the
     * persisted status here as well, rather than rejecting an Ask Arrival
     * action that the staff UI legitimately offered.
     *
     * ARRIVING is also eligible: staff may ask again after a customer
     * previously answered YES. ARRIVED remains a physical check-in and
     * must not be overwritten by another question.
     */
    const storedStatus = String(entry.status ?? '').trim().toUpperCase();
    if (storedStatus === 'ARRIVED') {
      return NextResponse.json(
        { error: true, errorMessage: 'This vehicle has already been marked arrived.' },
        { status: 422 },
      );
    }

    if (
      entry.arrivalRequestAt &&
      (!entry.arrivalResponseAt ||
        new Date(entry.arrivalResponseAt).getTime() < new Date(entry.arrivalRequestAt).getTime())
    ) {
      return NextResponse.json(
        { error: true, errorMessage: 'An arrival question is already awaiting a response.' },
        { status: 409 },
      );
    }

    const effectiveQueueStatus = [
      'PENDING',
      'ARRIVING',
      'NOT_ARRIVED',
    ].includes(storedStatus)
      ? storedStatus
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
            eq(ServiceQueue.status, entry.status),
            ...(entry.arrivalRequestAt
              ? [eq(ServiceQueue.arrivalRequestAt, entry.arrivalRequestAt)]
              : [isNull(ServiceQueue.arrivalRequestAt)]),
            ...(entry.arrivalResponseAt
              ? [eq(ServiceQueue.arrivalResponseAt, entry.arrivalResponseAt)]
              : [isNull(ServiceQueue.arrivalResponseAt)]),
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

    await mobileServiceQueueTriggers
      .onArrivalQuestion({
        appointmentId,
        requestAt: now.toISOString(),
        vehicleMake: appointment.vehicleMake || '',
        vehicleModel: appointment.vehicleModel || '',
        vehicleYear: appointment.vehicleYear ?? null,
        plateNumber: appointment.plateNumber || '', 
        customerId:
          appointment.customerId,
        trackingNumber:
          appointment.trackingNumber,
        customerName:
          appointment.customerName ||
          'Customer',
      });

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
