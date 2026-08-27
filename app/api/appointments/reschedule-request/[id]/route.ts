import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { AppointmentRescheduleRequests } from '@/database/models/appointments/appointment-reschedule-requests.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const { action, customerId } = body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: true, errorMessage: 'Action must be approve or reject' }, { status: 422 });
  }

  if (!customerId || !isValidUUID(customerId)) {
    return NextResponse.json({ error: true, errorMessage: 'Customer ID is required' }, { status: 422 });
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

  // Verify the customer owns the appointment
  const [appointment] = await Database.select()
    .from(Appointments)
    .where(eq(Appointments.id, request.appointmentId));
  if (!appointment || appointment.customerId !== customerId) {
    return NextResponse.json({ error: true, errorMessage: 'You do not have permission to act on this request' }, { status: 403 });
  }

  // Get the appointment info for notifications
  const info = await getAppointmentInfo(request.appointmentId);
  const trackingNumber = info.trackingNumber;
  const customerName = info.customerName || 'Customer';

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
    mobileAppointmentsTriggers.onRescheduleApproved({
      customerId,
      trackingNumber,
      newDate: request.newAppointmentDate,
      newTime: request.newAppointmentTime,
    }).catch(console.error);

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

    // ----- TRIGGERS (Rejected) -----
    mobileAppointmentsTriggers.onRescheduleRejected({
      customerId,
      trackingNumber,
    }).catch(console.error);

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