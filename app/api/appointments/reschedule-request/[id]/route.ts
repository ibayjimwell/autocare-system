import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { isValidUUID } from '@/utils/shared';
import { eq } from 'drizzle-orm';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from '@/app-triggers/appointments';
import { verifyJWT } from '@/utils/jwt';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  if (!isValidUUID(requestId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid request ID' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  let staffId: string | null = null;
  let customerId: string | null = null;
  let isStaff = false;

  if (session?.user?.id) {
    staffId = session.user.id;
    isStaff = true;
  } else {
    // Try customer JWT from header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await verifyJWT(token);
        if (decoded && decoded.id) {
          customerId = decoded.id;
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { action, rejectionReason } = body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: true, errorMessage: 'Action must be approve or reject' }, { status: 422 });
  }

  if (action === 'reject' && (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0)) {
    return NextResponse.json({ error: true, errorMessage: 'A reason is required for rejection' }, { status: 422 });
  }

  const [request] = await Database.select()
    .from(AppointmentRescheduleRequests)
    .where(eq(AppointmentRescheduleRequests.id, requestId));
  if (!request) {
    return NextResponse.json({ error: true, errorMessage: 'Request not found' }, { status: 404 });
  }

  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: true, errorMessage: 'Request already processed' }, { status: 422 });
  }

  // If it's a customer, verify they own the appointment
  if (customerId) {
    const [appointment] = await Database.select()
      .from(Appointments)
      .where(eq(Appointments.id, request.appointmentId));
    if (!appointment || appointment.customerId !== customerId) {
      return NextResponse.json({ error: true, errorMessage: 'You do not have permission to act on this request' }, { status: 403 });
    }
  }

  // Get the appointment info for notifications
  const info = await getAppointmentInfo(request.appointmentId);
  const trackingNumber = info.trackingNumber;
  const customerName = info.customerName || 'Customer';

  // Get customer ID for mobile notifications
  const [appt] = await Database.select({ customerId: Appointments.customerId })
    .from(Appointments)
    .where(eq(Appointments.id, request.appointmentId));
  const customerIdForNotif = appt?.customerId;

  if (action === 'approve') {
    // Update appointment date/time
    await Database.update(Appointments)
      .set({
        appointmentDate: request.newAppointmentDate,
        appointmentTime: request.newAppointmentTime,
        updatedAt: new Date(),
      })
      .where(eq(Appointments.id, request.appointmentId));

    await Database.update(AppointmentRescheduleRequests)
      .set({ status: 'APPROVED', updatedAt: new Date() })
      .where(eq(AppointmentRescheduleRequests.id, requestId));

    // ----- TRIGGERS (Approved) -----
    if (customerIdForNotif) {
      mobileAppointmentsTriggers.onRescheduleApproved({
        customerId: customerIdForNotif,
        trackingNumber,
        newDate: request.newAppointmentDate,
        newTime: request.newAppointmentTime,
      }).catch(console.error);
    }

    appointmentsTriggers.onRescheduleApproved({
      trackingNumber,
      customerName,
      newDate: request.newAppointmentDate,
      newTime: request.newAppointmentTime,
    }).catch(console.error);

    return NextResponse.json({
      error: false,
      message: 'Appointment rescheduled successfully',
    }, { status: 200 });
  } else {
    // Reject – update request status and store rejection reason
    await Database.update(AppointmentRescheduleRequests)
      .set({
        status: 'REJECTED',
        reason: rejectionReason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(AppointmentRescheduleRequests.id, requestId));

    // ----- TRIGGERS (Rejected) -----
    if (customerIdForNotif) {
      mobileAppointmentsTriggers.onRescheduleRejected({
        customerId: customerIdForNotif,
        trackingNumber,
        reason: rejectionReason.trim(),
      }).catch(console.error);
    }

    appointmentsTriggers.onRescheduleRejected({
      trackingNumber,
      customerName,
      reason: rejectionReason.trim(),
    }).catch(console.error);

    return NextResponse.json({
      error: false,
      message: 'Reschedule request rejected',
    }, { status: 200 });
  }
}