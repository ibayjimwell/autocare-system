import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { and, eq, inArray } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// GET /api/appointments/reschedule-requests/pending
//
// Query:
// ?ids=<uuid>,<uuid>,<uuid>
//
// Returns the number of PENDING reschedule requests for each supplied
// appointment. Appointments without a pending request are omitted.
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        {
          error: false,
          data: {},
        },
        { status: 200 },
      );
    }

    const appointmentIds = Array.from(
      new Set(
        idsParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    if (appointmentIds.length === 0) {
      return NextResponse.json(
        {
          error: false,
          data: {},
        },
        { status: 200 },
      );
    }

    if (appointmentIds.length > 500) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Too many appointment IDs. Maximum is 500.',
        },
        { status: 422 },
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      appointmentIds.some(
        (id) => !uuidRegex.test(id),
      )
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'One or more appointment IDs are invalid.',
        },
        { status: 422 },
      );
    }

    const pendingRequests = await Database.select({
      appointmentId:
        AppointmentRescheduleRequests.appointmentId,
    })
      .from(AppointmentRescheduleRequests)
      .where(
        and(
          inArray(
            AppointmentRescheduleRequests.appointmentId,
            appointmentIds,
          ),
          eq(
            AppointmentRescheduleRequests.status,
            'PENDING',
          ),
        ),
      );

    const data: Record<string, number> = {};

    for (const request of pendingRequests) {
      const appointmentId = request.appointmentId;

      data[appointmentId] =
        (data[appointmentId] ?? 0) + 1;
    }

    return NextResponse.json(
      {
        error: false,
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[GET /api/appointments/reschedule-requests/pending] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Failed to fetch pending reschedule requests',
      },
      { status: 500 },
    );
  }
}
