import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { isValidUUID } from '@/utils/shared';
import { eq, desc } from 'drizzle-orm';
import { canReschedule } from '@/utils/appointments';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from '@/app-triggers/appointments';
import { verifyJWT } from '@/utils/jwt';

// ------------------------------------------------------------------
// GET /api/appointments/[id]/reschedule-request – List reschedule requests
// ------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;
  if (!isValidUUID(appointmentId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid appointment ID' }, { status: 422 });
  }

  try {
    const requests = await Database.select()
      .from(AppointmentRescheduleRequests)
      .where(eq(AppointmentRescheduleRequests.appointmentId, appointmentId))
      .orderBy(desc(AppointmentRescheduleRequests.createdAt));

    return NextResponse.json({
      error: false,
      data: requests,
    }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/appointments/[id]/reschedule-request] Error:', e);
    return NextResponse.json({
      error: true,
      errorMessage: 'Failed to fetch reschedule requests',
    }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// POST /api/appointments/[id]/reschedule-request – Create a reschedule request
// ------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;
  if (!isValidUUID(appointmentId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid appointment ID' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  let customerId: string | undefined = undefined;
  let staffId: string | undefined = undefined;
  let requestedBy: 'customer' | 'staff' = 'customer';

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  // Determine who is making the request (staff via session, customer via body or JWT)
  if (session?.user?.id) {
    staffId = session.user.id;
    requestedBy = 'staff';
  } else if (body.customerId && isValidUUID(body.customerId)) {
    customerId = body.customerId;
    requestedBy = 'customer';
  } else {
    // Try customer JWT from header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await verifyJWT(token);
        if (decoded && decoded.id) {
          customerId = decoded.id;
          requestedBy = 'customer';
        }
      } catch (err) {
        console.error('JWT verification failed:', err);
        // Continue without customerId – will return 401 below
      }
    }
  }

  if (!staffId && !customerId) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }

  // Validate appointment exists and can be rescheduled
  const [appointment] = await Database.select()
    .from(Appointments)
    .where(eq(Appointments.id, appointmentId));
  if (!appointment) {
    return NextResponse.json({ error: true, errorMessage: 'Appointment not found' }, { status: 404 });
  }

  if (!canReschedule(appointment.status)) {
    return NextResponse.json({ error: true, errorMessage: 'Appointment cannot be rescheduled at this stage' }, { status: 422 });
  }

  if (requestedBy === 'customer' && appointment.customerId !== customerId) {
    return NextResponse.json({ error: true, errorMessage: 'You do not own this appointment' }, { status: 403 });
  }

  // Check if there's already a pending request for this appointment
  const [pending] = await Database.select()
    .from(AppointmentRescheduleRequests)
    .where(
      eq(AppointmentRescheduleRequests.appointmentId, appointmentId),
      eq(AppointmentRescheduleRequests.status, 'PENDING')
    )
    .limit(1);
  if (pending) {
    return NextResponse.json({ error: true, errorMessage: 'A pending reschedule request already exists for this appointment' }, { status: 409 });
  }

  const { newAppointmentDate, newAppointmentTime, reason } = body;
  if (!newAppointmentDate || !newAppointmentTime) {
    return NextResponse.json({ error: true, errorMessage: 'New date and time are required' }, { status: 422 });
  }

  // Create request
  const [request] = await Database.insert(AppointmentRescheduleRequests)
    .values({
      appointmentId,
      requestedBy,
      requestedByCustomerId: requestedBy === 'customer' ? customerId : null,
      requestedByStaffId: requestedBy === 'staff' ? staffId : null,
      newAppointmentDate,
      newAppointmentTime,
      reason: reason || null,
      status: 'PENDING',
    })
    .returning();

  // ----- TRIGGERS -----
  const info = await getAppointmentInfo(appointmentId);
  const trackingNumber = info.trackingNumber;
  const customerName = info.customerName || 'Customer';

  if (requestedBy === 'staff') {
    // Staff requested → notify customer (mobile)
    mobileAppointmentsTriggers.onRescheduleRequested({
      customerId: appointment.customerId,
      trackingNumber,
      newDate: newAppointmentDate,
      newTime: newAppointmentTime,
    }).catch(console.error);
    // Also notify staff (system)
    appointmentsTriggers.onRescheduleRequested({
      trackingNumber,
      customerName,
      requestedBy: 'staff',
      newDate: newAppointmentDate,
      newTime: newAppointmentTime,
    }).catch(console.error);
  } else {
    // Customer requested → notify staff (system)
    appointmentsTriggers.onRescheduleRequested({
      trackingNumber,
      customerName,
      requestedBy: 'customer',
      newDate: newAppointmentDate,
      newTime: newAppointmentTime,
    }).catch(console.error);
    // Notify customer (mobile) that their request was submitted
    mobileAppointmentsTriggers.onRescheduleRequestedByCustomer({
      customerId: appointment.customerId,
      trackingNumber,
      newDate: newAppointmentDate,
      newTime: newAppointmentTime,
    }).catch(console.error);
  }

  return NextResponse.json({
    error: false,
    message: 'Reschedule request created',
    data: request,
  }, { status: 201 });
}