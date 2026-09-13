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
  sql,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  serviceQueueTriggers,
} from '@/triggers/service-queue';

import {
  mobileServiceQueueTriggers,
} from '@/app-triggers/service-queue';

/* ================================================================
   POST /api/service-queue/reorder
================================================================ */

export async function POST(
  req: NextRequest,
) {
  let body: any;

  /* --------------------------------------------------------------
     PARSE BODY
  -------------------------------------------------------------- */

  try {
    body =
      await req.json();
  } catch (
    e
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Invalid JSON.',
      },
      {
        status:
          400,
      },
    );
  }

  const {
    appointmentId,
    newPosition,
  } =
    body;

  /* --------------------------------------------------------------
     VALIDATE APPOINTMENT ID
  -------------------------------------------------------------- */

  if (
    !appointmentId ||
    !isValidUUID(
      appointmentId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Valid appointmentId is required.',
      },
      {
        status:
          400,
      },
    );
  }

  /* --------------------------------------------------------------
     VALIDATE POSITION
  -------------------------------------------------------------- */

  if (
    typeof newPosition !==
      'number' ||
    !Number.isInteger(
      newPosition,
    ) ||
    newPosition <
      1
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'newPosition must be a positive integer.',
      },
      {
        status:
          400,
      },
    );
  }

  try {
    /* ------------------------------------------------------------
       GET QUEUE ENTRY
    ------------------------------------------------------------- */

    const [
      entry,
    ] =
      await Database.select()
        .from(
          ServiceQueue,
        )
        .where(
          eq(
            ServiceQueue.appointmentId,
            appointmentId,
          ),
        )
        .limit(
          1,
        );

    if (
      !entry
    ) {
      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            'Queue entry not found.',
        },
        {
          status:
            404,
        },
      );
    }

    const currentPosition =
      entry.queueNumber;

    const date =
      entry.queueDate;

    /* --------------------------------------------------------------
       SAME POSITION
    -------------------------------------------------------------- */

    if (
      currentPosition ===
      newPosition
    ) {
      return NextResponse.json(
        {
          error:
            false,

          message:
            'Already at that position.',
        },
        {
          status:
            200,
        },
      );
    }

    /* --------------------------------------------------------------
       MOVE UP
    -------------------------------------------------------------- */

    if (
      newPosition <
      currentPosition
    ) {
      await Database.execute(
        sql`
          UPDATE service_queue
          SET queue_number =
            queue_number + 1
          WHERE queue_date = ${date}
            AND queue_number >= ${newPosition}
            AND queue_number < ${currentPosition}
        `,
      );
    } else {
      /* ------------------------------------------------------------
         MOVE DOWN
      ------------------------------------------------------------- */

      await Database.execute(
        sql`
          UPDATE service_queue
          SET queue_number =
            queue_number - 1
          WHERE queue_date = ${date}
            AND queue_number > ${currentPosition}
            AND queue_number <= ${newPosition}
        `,
      );
    }

    /* --------------------------------------------------------------
       UPDATE STORED POSITION
    -------------------------------------------------------------- */

    await Database.update(
      ServiceQueue,
    )
      .set({
        queueNumber:
          newPosition,

        updatedAt:
          new Date(),
      })
      .where(
        eq(
          ServiceQueue.id,
          entry.id,
        ),
      );

    /* --------------------------------------------------------------
       APPOINTMENT INFORMATION FOR TRIGGERS
    -------------------------------------------------------------- */

    const [
      appt,
    ] =
      await Database.select({
        customerId:
          Appointments.customerId,

        trackingNumber:
          Appointments.trackingNumber,
      })
        .from(
          Appointments,
        )
        .where(
          eq(
            Appointments.id,
            appointmentId,
          ),
        )
        .limit(
          1,
        );

    /* --------------------------------------------------------------
       TRIGGERS
    -------------------------------------------------------------- */

    if (
      appt
    ) {
      serviceQueueTriggers
        .onPositionChanged({
          appointmentId,
          trackingNumber:
            appt.trackingNumber,
          newPosition,
        })
        .catch(
          console.error,
        );

      mobileServiceQueueTriggers
        .onPositionChanged({
          customerId:
            appt.customerId,

          trackingNumber:
            appt.trackingNumber,

          newPosition,
        })
        .catch(
          console.error,
        );
    }

    /* --------------------------------------------------------------
       RESPONSE
    -------------------------------------------------------------- */

    return NextResponse.json(
      {
        error:
          false,

        message:
          'Queue position updated. Canonical queue ordering remains based on appointment time, then createdAt.',

        /*
         * The persisted queueNumber was updated for compatibility
         * with existing reorder functionality.
         *
         * However, GET /api/queue derives the effective display
         * position from appointmentTime + createdAt.
         */
        appointmentTimePriority:
          true,
      },
      {
        status:
          200,
      },
    );
  } catch (
    e
  ) {
    console.error(
      '[POST /api/service-queue/reorder] Error:',
      e,
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
          'Failed to reorder queue.',

        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status:
          500,
      },
    );
  }
}