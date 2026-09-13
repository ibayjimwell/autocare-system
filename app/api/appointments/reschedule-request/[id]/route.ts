import { NextRequest, NextResponse } from 'next/server';

import { Database } from '@/lib/drizzle';

import {
  AppointmentRescheduleRequests,
} from '@/database/models/appointments/appointment-reschedule-requests.model';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  ServiceQueue,
} from '@/database/models/queue/service-queue.model';

import {
  getServerSession,
} from 'next-auth';

import {
  authOptions,
} from '@/lib/auth/staffs/auth';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  eq,
} from 'drizzle-orm';

import {
  getAppointmentInfo,
} from '@/utils/payments/get-appointment-info';

import {
  appointmentsTriggers,
} from '@/triggers/appointments';

import {
  mobileAppointmentsTriggers,
} from '@/app-triggers/appointments';

import {
  verifyJWT,
} from '@/utils/jwt';

/* ================================================================
   PATCH /api/appointments/reschedule-request/[id]

   Approve:
     1. Update appointment date/time.
     2. Synchronize the existing ServiceQueue.queueDate.
     3. Mark reschedule request APPROVED.
     4. Send notifications.

   Reject:
     1. Mark request REJECTED.
     2. Store rejection reason.
     3. Send notifications.
================================================================ */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const {
    id: requestId,
  } = await params;

  /* ==============================================================
     VALIDATE REQUEST ID
  ============================================================== */

  if (
    !isValidUUID(
      requestId,
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid request ID',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     AUTHENTICATION
  ============================================================== */

  const session =
    await getServerSession(
      authOptions,
    );

  let staffId:
    | string
    | null = null;

  let customerId:
    | string
    | null = null;

  if (
    session?.user?.id
  ) {
    staffId =
      session.user.id;
  } else {
    const authHeader =
      req.headers.get(
        'authorization',
      );

    if (
      authHeader?.startsWith(
        'Bearer ',
      )
    ) {
      const token =
        authHeader.slice(
          7,
        );

      try {
        const decoded =
          await verifyJWT(
            token,
          );

        if (
          decoded?.id
        ) {
          customerId =
            decoded.id;
        }
      } catch (
        error
      ) {
        console.error(
          '[PATCH reschedule-request] JWT verification failed:',
          error,
        );
      }
    }
  }

  if (
    !staffId &&
    !customerId
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unauthorized',
      },
      {
        status: 401,
      },
    );
  }

  /* ==============================================================
     PARSE BODY
  ============================================================== */

  let body: {
    action?: string;
    rejectionReason?: string;
  };

  try {
    body =
      await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid JSON',
      },
      {
        status: 400,
      },
    );
  }

  const {
    action,
    rejectionReason,
  } = body;

  if (
    !action ||
    ![
      'approve',
      'reject',
    ].includes(action)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Action must be approve or reject',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     VALIDATE REJECTION REASON
  ============================================================== */

  if (
    action ===
      'reject' &&
    (
      !rejectionReason ||
      typeof rejectionReason !==
        'string' ||
      !rejectionReason.trim()
    )
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'A reason is required for rejection',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     LOAD REQUEST
  ============================================================== */

  const [
    request,
  ] =
    await Database
      .select()
      .from(
        AppointmentRescheduleRequests,
      )
      .where(
        eq(
          AppointmentRescheduleRequests.id,
          requestId,
        ),
      );

  if (
    !request
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Request not found',
      },
      {
        status: 404,
      },
    );
  }

  /* ==============================================================
     REQUEST MUST STILL BE PENDING
  ============================================================== */

  if (
    request.status !==
    'PENDING'
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Request already processed',
      },
      {
        status: 422,
      },
    );
  }

  /* ==============================================================
     LOAD APPOINTMENT
  ============================================================== */

  const [
    appointment,
  ] =
    await Database
      .select()
      .from(
        Appointments,
      )
      .where(
        eq(
          Appointments.id,
          request.appointmentId,
        ),
      );

  if (
    !appointment
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Appointment not found',
      },
      {
        status: 404,
      },
    );
  }

  /* ==============================================================
     CUSTOMER OWNERSHIP VALIDATION
  ============================================================== */

  if (
    customerId &&
    appointment.customerId !==
      customerId
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'You do not have permission to act on this request',
      },
      {
        status: 403,
      },
    );
  }

  /* ==============================================================
     APPOINTMENT INFORMATION
  ============================================================== */

  const info =
    await getAppointmentInfo(
      request.appointmentId,
    );

  const trackingNumber =
    info.trackingNumber;

  const customerName =
    info.customerName ||
    'Customer';

  /* ==============================================================
     CUSTOMER ID FOR NOTIFICATIONS
  ============================================================== */

  const [
    appointmentForNotification,
  ] =
    await Database
      .select({
        customerId:
          Appointments.customerId,
      })
      .from(
        Appointments,
      )
      .where(
        eq(
          Appointments.id,
          request.appointmentId,
        ),
      );

  const customerIdForNotif =
    appointmentForNotification?.customerId;

  /* ==============================================================
     APPROVE
  ============================================================== */

  if (
    action ===
    'approve'
  ) {
    const now =
      new Date();

    /* ------------------------------------------------------------
       1. UPDATE APPOINTMENT
    ------------------------------------------------------------- */

    await Database
      .update(
        Appointments,
      )
      .set({
        appointmentDate:
          request.newAppointmentDate,

        appointmentTime:
          request.newAppointmentTime,

        updatedAt:
          now,
      })
      .where(
        eq(
          Appointments.id,
          request.appointmentId,
        ),
      );

    /* ------------------------------------------------------------
       2. SYNCHRONIZE SERVICE QUEUE
       
       ServiceQueue stores its own queueDate.

       A confirmed appointment already in the queue must move with
       the appointment when a reschedule is approved.

       IMPORTANT:
       We update ALL queue records for this appointment, not just
       one, so an old/stale duplicate cannot remain attached to the
       previous date.
    ------------------------------------------------------------- */

    await Database
      .update(
        ServiceQueue,
      )
      .set({
        queueDate:
          request.newAppointmentDate,

        updatedAt:
          now,
      })
      .where(
        eq(
          ServiceQueue.appointmentId,
          request.appointmentId,
        ),
      );

    /* ------------------------------------------------------------
       3. MARK REQUEST APPROVED
    ------------------------------------------------------------- */

    await Database
      .update(
        AppointmentRescheduleRequests,
      )
      .set({
        status:
          'APPROVED',

        updatedAt:
          now,
      })
      .where(
        eq(
          AppointmentRescheduleRequests.id,
          requestId,
        ),
      );

    /* ------------------------------------------------------------
       4. NOTIFY CUSTOMER
    ------------------------------------------------------------- */

    if (
      customerIdForNotif
    ) {
      mobileAppointmentsTriggers
        .onRescheduleApproved({
          customerId:
            customerIdForNotif,

          trackingNumber,

          newDate:
            request.newAppointmentDate,

          newTime:
            request.newAppointmentTime,
        })
        .catch(
          console.error,
        );
    }

    /* ------------------------------------------------------------
       5. NOTIFY STAFF / SYSTEM
    ------------------------------------------------------------- */

    appointmentsTriggers
      .onRescheduleApproved({
        trackingNumber,

        customerName,

        newDate:
          request.newAppointmentDate,

        newTime:
          request.newAppointmentTime,
      })
      .catch(
        console.error,
      );

    /* ------------------------------------------------------------
       RESPONSE
    ------------------------------------------------------------- */

    return NextResponse.json(
      {
        error: false,

        message:
          'Appointment rescheduled successfully',

        data: {
          appointmentId:
            request.appointmentId,

          appointmentDate:
            request.newAppointmentDate,

          appointmentTime:
            request.newAppointmentTime,

          queueDate:
            request.newAppointmentDate,
        },
      },
      {
        status: 200,
      },
    );
  }

  /* ==============================================================
     REJECT
  ============================================================== */

  const normalizedRejectionReason =
    rejectionReason!.trim();

  const now =
    new Date();

  /* --------------------------------------------------------------
     UPDATE REQUEST
  -------------------------------------------------------------- */

  await Database
    .update(
      AppointmentRescheduleRequests,
    )
    .set({
      status:
        'REJECTED',

      reason:
        normalizedRejectionReason,

      updatedAt:
        now,
    })
    .where(
      eq(
        AppointmentRescheduleRequests.id,
        requestId,
      ),
    );

  /* --------------------------------------------------------------
     NOTIFY CUSTOMER
  -------------------------------------------------------------- */

  if (
    customerIdForNotif
  ) {
    mobileAppointmentsTriggers
      .onRescheduleRejected({
        customerId:
          customerIdForNotif,

        trackingNumber,

        reason:
          normalizedRejectionReason,
      })
      .catch(
        console.error,
      );
  }

  /* --------------------------------------------------------------
     NOTIFY STAFF / SYSTEM
  -------------------------------------------------------------- */

  appointmentsTriggers
    .onRescheduleRejected({
      trackingNumber,

      customerName,

      reason:
        normalizedRejectionReason,
    })
    .catch(
      console.error,
    );

  /* --------------------------------------------------------------
     RESPONSE
  -------------------------------------------------------------- */

  return NextResponse.json(
    {
      error: false,

      message:
        'Reschedule request rejected',
    },
    {
      status: 200,
    },
  );
}