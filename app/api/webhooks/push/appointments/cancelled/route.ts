import { NextRequest, NextResponse } from 'next/server';
import { sendPushToModule } from '@/utils/push-send';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = body.record;
    const oldRecord = body.old_record;

    const trackingNumber = record?.trackingNumber || 'N/A';
    const customerName = record?.customer?.fullname || record?.customerId || 'Customer';
    const reason = record?.notes || oldRecord?.notes || 'No reason provided';

    await sendPushToModule(
      'appointments',
      'Appointment Cancelled',
      `#${trackingNumber} for ${customerName}. Reason: ${reason}`,
      '/appointments'
    );

    return NextResponse.json({ error: false, message: 'Push sent' }, { status: 200 });
  } catch (e) {
    console.error('[POST /api/webhooks/push/appointments/cancelled]', e);
    return NextResponse.json({ error: true, errorMessage: 'Push failed' }, { status: 500 });
  }
}