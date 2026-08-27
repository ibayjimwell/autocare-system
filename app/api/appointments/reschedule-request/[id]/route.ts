import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';
import { isValidUUID } from '@/utils/shared';
import { eq } from 'drizzle-orm';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { appointmentsTriggers } from '@/triggers/appointments';
import { mobileAppointmentsTriggers } from '@/app-triggers/appointments';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  if (!isValidUUID(requestId)) {
    return NextResponse.json({ error: true, errorMessage: 'Invalid request ID' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: true, errorMessage: 'Action must be approve or reject' }, { status: 422 });
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

  // Get the appointment info before updating
  const info = await getAppointmentInfo(request.appointmentId);
  const trackingNumber = info.trackingNumber;
  const customerName = info.customerName || 'Customer';
  const customerId = request.requestedByCustomerId;

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

    // Notify customer (mobile)
    if (customerId) {
      mobileAppointmentsTriggers.onRescheduleApproved({
        customerId,
        trackingNumber,
        newDate: request.newAppointmentDate,
        newTime: request.newAppointmentTime,
      }).catch(console.error);
    }

    // Notify staff (system)
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
    // Reject
    await Database.update(AppointmentRescheduleRequests)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(AppointmentRescheduleRequests.id, requestId));

    // Also cancel the appointment if it was requested by customer? Not needed; we just reject.

    // ----- TRIGGERS (Rejected) -----

    // Notify customer (mobile)
    if (customerId) {
      mobileAppointmentsTriggers.onRescheduleRejected({
        customerId,
        trackingNumber,
      }).catch(console.error);
    }

    // Notify staff (system)
    appointmentsTriggers.onRescheduleRejected({
      trackingNumber,
      customerName,
    }).catch(console.error);

    return NextResponse.json({
      error: false,
      message: 'Reschedule request rejected',
    }, { status: 200 });
  }
}