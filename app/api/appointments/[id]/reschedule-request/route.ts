import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { isValidUUID } from '@/utils/shared';
import { eq, desc, and } from 'drizzle-orm';
import { canReschedule } from '@/utils/appointments';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from '@/app-triggers/appointments';
import { verifyJWT } from '@/utils/jwt';

// -----------------------------------------------------------------------------
// GET /api/appointments/[id]/reschedule-request
//
// Returns ALL reschedule requests for one appointment.
//
// Existing behavior is preserved for:
// - RescheduleRequestModal
// - Appointment details
// - Customer / staff reschedule workflows
// -----------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  if (!isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Invalid appointment ID',
      },
      { status: 422 }
    );
  }

  try {
    const requests = await Database.select()
      .from(AppointmentRescheduleRequests)
      .where(eq(AppointmentRescheduleRequests.appointmentId, appointmentId))
      .orderBy(desc(AppointmentRescheduleRequests.createdAt));

    return NextResponse.json(
      {
        error: false,
        data: requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      '[GET /api/appointments/[id]/reschedule-request] Error:',
      error
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Failed to fetch reschedule requests',
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// POST /api/appointments/[id]/reschedule-request
//
// Creates a new reschedule request.
//
// Existing customer/staff behavior is preserved.
// -----------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  if (!isValidUUID(appointmentId)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Invalid appointment ID',
      },
      { status: 422 }
    );
  }

  const session = await getServerSession(authOptions);

  let customerId: string | undefined;
  let staffId: string | undefined;

  let requestedBy: 'customer' | 'staff' = 'customer';

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Invalid JSON',
      },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // Determine requester
  // ---------------------------------------------------------------------------

  if (session?.user?.id) {
    staffId = session.user.id;
    requestedBy = 'staff';
  } else if (body?.customerId && isValidUUID(body.customerId)) {
    customerId = body.customerId;
    requestedBy = 'customer';
  } else {
    const authHeader = req.headers.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const decoded = await verifyJWT(token);

        if (decoded?.id) {
          customerId = decoded.id;
          requestedBy = 'customer';
        }
      } catch (error) {
        console.error(
          '[POST reschedule-request] JWT verification failed:',
          error
        );
      }
    }
  }

  if (!staffId && !customerId) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  // ---------------------------------------------------------------------------
  // Validate appointment
  // ---------------------------------------------------------------------------

  const [appointment] = await Database.select()
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId));

  if (!appointment) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Appointment not found',
      },
      { status: 404 }
    );
  }

  if (!canReschedule(appointment.status)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'Appointment cannot be rescheduled at this stage',
      },
      { status: 422 }
    );
  }

  // Customer can only reschedule their own appointment.
  if (
    requestedBy === 'customer' &&
    appointment.customerId !== customerId
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'You do not own this appointment',
      },
      { status: 403 }
    );
  }

  // ---------------------------------------------------------------------------
  // Prevent duplicate pending request
  // ---------------------------------------------------------------------------

  const pendingRequests = await Database.select()
    .from(AppointmentRescheduleRequests)
    .where(
      and(
        eq(
          AppointmentRescheduleRequests.appointmentId,
          appointmentId
        ),
        eq(
          AppointmentRescheduleRequests.status,
          'PENDING'
        )
      )
    )
    .limit(1);

  if (pendingRequests.length > 0) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'A pending reschedule request already exists for this appointment.',
        pendingRequest: pendingRequests[0],
      },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------------------------
  // Validate requested date/time
  // ---------------------------------------------------------------------------

  const {
    newAppointmentDate,
    newAppointmentTime,
    reason,
  } = body ?? {};

  if (!newAppointmentDate || !newAppointmentTime) {
    return NextResponse.json(
      {
        error: true,
        errorMessage: 'New date and time are required',
      },
      { status: 422 }
    );
  }

  // ---------------------------------------------------------------------------
  // Create request
  // ---------------------------------------------------------------------------

  const [request] = await Database.insert(
    AppointmentRescheduleRequests
  )
    .values({
      appointmentId,
      requestedBy,

      requestedByCustomerId:
        requestedBy === 'customer'
          ? customerId ?? null
          : null,

      requestedByStaffId:
        requestedBy === 'staff'
          ? staffId ?? null
          : null,

      newAppointmentDate,
      newAppointmentTime,

      reason:
        typeof reason === 'string' && reason.trim().length > 0
          ? reason.trim()
          : null,

      status: 'PENDING',
    })
    .returning();

  // ---------------------------------------------------------------------------
  // Notifications / triggers
  // ---------------------------------------------------------------------------

  try {
    const info = await getAppointmentInfo(appointmentId);

    const trackingNumber = info.trackingNumber;
    const customerName = info.customerName || 'Customer';

    if (requestedBy === 'staff') {
      // Staff requested -> notify customer.
      mobileAppointmentsTriggers
        .onRescheduleRequested({
          customerId: appointment.customerId,
          trackingNumber,
          newDate: newAppointmentDate,
          newTime: newAppointmentTime,
        })
        .catch(console.error);

      // Staff/system notification.
      appointmentsTriggers
        .onRescheduleRequested({
          trackingNumber,
          customerName,
          requestedBy: 'staff',
          newDate: newAppointmentDate,
          newTime: newAppointmentTime,
        })
        .catch(console.error);
    } else {
      // Customer requested -> notify staff.
      appointmentsTriggers
        .onRescheduleRequested({
          trackingNumber,
          customerName,
          requestedBy: 'customer',
          newDate: newAppointmentDate,
          newTime: newAppointmentTime,
        })
        .catch(console.error);

      // Notify customer that request was submitted.
      mobileAppointmentsTriggers
        .onRescheduleRequestedByCustomer({
          customerId: appointment.customerId,
          trackingNumber,
          newDate: newAppointmentDate,
          newTime: newAppointmentTime,
        })
        .catch(console.error);
    }
  } catch (error) {
    // Notification failure should not invalidate a successful request creation.
    console.error(
      '[POST /api/appointments/[id]/reschedule-request] Trigger error:',
      error
    );
  }

  return NextResponse.json(
    {
      error: false,
      message: 'Reschedule request created',
      data: request,
    },
    { status: 201 }
  );
}