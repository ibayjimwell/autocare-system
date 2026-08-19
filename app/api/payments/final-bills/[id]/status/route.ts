import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { Customers } from '@/database/models/customers/customers.model';
import { eq } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { paymentsTriggers } from '@/triggers/payments';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['HOLD', 'OFFICIAL'],
  HOLD: ['PENDING', 'OFFICIAL'],
  OFFICIAL: ['PAID'],
  PAID: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid bill ID' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const { status: newStatus } = body;
  if (!newStatus || typeof newStatus !== 'string') {
    return NextResponse.json(
      { error: true, errorMessage: 'Status is required.' },
      { status: 422 }
    );
  }

  const upperStatus = newStatus.toUpperCase();
  const validStatuses = ['PENDING', 'HOLD', 'OFFICIAL', 'PAID'];
  if (!validStatuses.includes(upperStatus)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid status. Allowed: PENDING, HOLD, OFFICIAL, PAID.' },
      { status: 422 }
    );
  }

  try {
    const [bill] = await Database.select()
      .from(FinalBill)
      .where(eq(FinalBill.id, id));

    if (!bill) {
      return NextResponse.json(
        { error: true, errorMessage: 'Final bill not found.' },
        { status: 404 }
      );
    }

    const currentStatus = bill.status;
    if (currentStatus === upperStatus) {
      return NextResponse.json(
        { error: true, errorMessage: `Bill is already ${upperStatus}.` },
        { status: 422 }
      );
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(upperStatus)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage: `Cannot transition from ${currentStatus} to ${upperStatus}.`,
        },
        { status: 422 }
      );
    }

    // ---- Handle HOLD ----
    if (upperStatus === 'HOLD') {
      const { parkingFeeRate, parkingFeeUnit } = body;
      if (!parkingFeeRate || !parkingFeeUnit) {
        return NextResponse.json(
          { error: true, errorMessage: 'Parking fee rate and unit are required for HOLD.' },
          { status: 422 }
        );
      }
      if (!['minute', 'hour', 'day'].includes(parkingFeeUnit)) {
        return NextResponse.json(
          { error: true, errorMessage: 'parkingFeeUnit must be minute, hour, or day.' },
          { status: 422 }
        );
      }
      await Database.update(FinalBill)
        .set({
          status: upperStatus,
          updatedAt: new Date(),
          holdStartedAt: new Date(),
          parkingFeeRate: parseFloat(parkingFeeRate).toString(),
          parkingFeeUnit,
        })
        .where(eq(FinalBill.id, id));

      const info = await getAppointmentInfo(bill.appointmentId);
      paymentsTriggers.onFinalBillStatusChanged({
        trackingNumber: info.trackingNumber,
        customerName: info.customerName,
        newStatus: upperStatus,
      }).catch(console.error);

      return NextResponse.json({
        error: false,
        message: `Final bill status updated to ${upperStatus}.`,
        data: { id, status: upperStatus },
      }, { status: 200 });
    }

    // ---- Handle un-hold (PENDING or OFFICIAL) ----
    if (upperStatus === 'PENDING' || upperStatus === 'OFFICIAL') {
      let parkingFee = 0;
      let parkingFeeData = null;

      // If currently on HOLD, calculate parking fee
      if (currentStatus === 'HOLD' && bill.holdStartedAt) {
        const now = new Date();
        const diffMs = now.getTime() - new Date(bill.holdStartedAt).getTime();
        const rate = parseFloat(bill.parkingFeeRate);
        const unit = bill.parkingFeeUnit;
        if (unit === 'minute') {
          parkingFee = (diffMs / 60000) * rate;
        } else if (unit === 'hour') {
          parkingFee = (diffMs / 3600000) * rate;
        } else if (unit === 'day') {
          parkingFee = (diffMs / 86400000) * rate;
        }
        parkingFee = Math.round(parkingFee * 100) / 100;

        // Add as a fee
        if (parkingFee > 0) {
          await Database.insert(FinalBillFees).values({
            finalBillId: id,
            title: `Parking Fee (${unit})`,
            amount: parkingFee.toFixed(2),
          });
        }

        // Update totals
        const feesTotal = parseFloat(bill.feesTotal) + parkingFee;
        const grandTotal = parseFloat(bill.grandTotal) + parkingFee;
        await Database.update(FinalBill)
          .set({
            status: upperStatus,
            updatedAt: new Date(),
            holdStartedAt: null,
            parkingFeeRate: null,
            parkingFeeUnit: null,
            feesTotal: feesTotal.toFixed(2),
            grandTotal: grandTotal.toFixed(2),
          })
          .where(eq(FinalBill.id, id));

        parkingFeeData = { fee: parkingFee, rate, unit };
      } else {
        // Just update status
        await Database.update(FinalBill)
          .set({ status: upperStatus, updatedAt: new Date() })
          .where(eq(FinalBill.id, id));
      }

      const info = await getAppointmentInfo(bill.appointmentId);
      paymentsTriggers.onFinalBillStatusChanged({
        trackingNumber: info.trackingNumber,
        customerName: info.customerName,
        newStatus: upperStatus,
      }).catch(console.error);

      if (upperStatus === 'PAID') {
        paymentsTriggers.onPaymentCompleted({
          trackingNumber: info.trackingNumber,
          customerName: info.customerName,
        }).catch(console.error);
      }

      return NextResponse.json({
        error: false,
        message: `Final bill status updated to ${upperStatus}.`,
        data: { id, status: upperStatus, parkingFee: parkingFeeData },
      }, { status: 200 });
    }

    // ---- Other transitions (e.g., PAID) ----
    await Database.update(FinalBill)
      .set({ status: upperStatus, updatedAt: new Date() })
      .where(eq(FinalBill.id, id));

    const info = await getAppointmentInfo(bill.appointmentId);
    paymentsTriggers.onFinalBillStatusChanged({
      trackingNumber: info.trackingNumber,
      customerName: info.customerName,
      newStatus: upperStatus,
    }).catch(console.error);

    if (upperStatus === 'PAID') {
      paymentsTriggers.onPaymentCompleted({
        trackingNumber: info.trackingNumber,
        customerName: info.customerName,
      }).catch(console.error);
    }

    return NextResponse.json({
      error: false,
      message: `Final bill status updated to ${upperStatus}.`,
      data: { id, status: upperStatus },
    }, { status: 200 });
  } catch (e) {
    console.error('[PATCH /api/payments/final-bills/[id]/status] Error:', e);
    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not update bill status.',
        errorLog: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}