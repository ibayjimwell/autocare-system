import { NextRequest, NextResponse } from 'next/server';
import { sendPushToModule } from '@/utils/push-send';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = body.record;

    const trackingNumber = record?.trackingNumber || 'N/A';
    const customerName = record?.customer?.fullname || record?.customerId || 'Customer';
    const appointmentDate = record?.appointmentDate
      ? new Date(record.appointmentDate).toLocaleDateString()
      : '';

    await sendPushToModule(
      'appointments',
      'New Appointment Booked',
      `#${trackingNumber} for ${customerName} on ${appointmentDate}`,
      '/appointments'
    );

    return NextResponse.json({ error: false, message: 'Push sent' }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/webhooks/push/appointments/new]', e);
    return NextResponse.json({ error: true, errorMessage: 'Push failed' }, { status: 500 });
  }
}