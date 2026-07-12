import { NextRequest, NextResponse } from 'next/server';
import { sendPushToModule } from '@/utils/push-send';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = body.record;

    const trackingNumber = record?.trackingNumber || 'N/A';
    const customerName = record?.customer?.fullname || record?.customerId || 'Customer';

    await sendPushToModule(
      'appointments',
      'Appointment Confirmed',
      `#${trackingNumber} for ${customerName} has been confirmed.`,
      '/service-tracking'
    );

    return NextResponse.json({ error: false, message: 'Push sent' }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/webhooks/push/appointments/confirmed]', e);
    return NextResponse.json({ error: true, errorMessage: 'Push failed' }, { status: 500 });
  }
}