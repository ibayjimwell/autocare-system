// app/api/payments/final-bills/[id]/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/drizzle';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { FinalBillFees } from '@/database/models/payments/final-bill-fees.model';
import { Configurations } from '@/database/models/configurations/configurations.model';
import { eq, and } from 'drizzle-orm';
import { isValidUUID } from '@/utils/shared';
import { getAppointmentInfo } from '@/utils/payments/get-appointment-info';
import { paymentsTriggers } from '@/triggers/payments';
import { mobilePaymentsTriggers } from '@/app-triggers/payments';

const DAY_MS = 24 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PARKED', 'OFFICIAL'],
  PARKED: ['PENDING'],
  OFFICIAL: ['PAID'],
  PAID: [],
};

class ParkingStateError extends Error {
  code = 'PARKING_STATE_CHANGED';
}

function toMoney(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBillableDays(startedAt: Date, now: Date): number {
  const diffMs = Math.max(0, now.getTime() - startedAt.getTime());

  /*
   * Billing rule:
   *
   * - Parking is ALWAYS billed in whole days.
   * - Any partial day counts as one day.
   * - A session shorter than 24 hours is still one billable day.
   */
  return Math.max(1, Math.ceil(diffMs / DAY_MS));
}

async function getPaymentConfig() {
  const [configRow] = await Database.select()
    .from(Configurations)
    .where(eq(Configurations.module, 'payments'));

  const raw =
    configRow?.config && typeof configRow.config === 'object'
      ? (configRow.config as any)
      : {};

  const parkingFeeRaw = Number(
    raw.parkingFeePerDay ??
      raw.parkingFee ??
      raw.parkingRate ??
      0,
  );

  return {
    parkingFeePerDay: Number.isFinite(parkingFeeRaw)
      ? Math.max(0, Math.round(parkingFeeRaw * 100) / 100)
      : 0,
  };
}

async function notifyStatusChange(
  bill: any,
  newStatus: string,
) {
  try {
    const info = await getAppointmentInfo(bill.appointmentId);

    paymentsTriggers.onFinalBillStatusChanged({
      trackingNumber: info.trackingNumber,
      customerName: info.customerName,
      newStatus,
    }).catch(console.error);

    /*
     * Preserve the existing trigger function name so older trigger
     * implementations keep working. The stored bill status and the
     * UI are now PARKED.
     */
    if (newStatus === 'PARKED') {
      mobilePaymentsTriggers.onFinalBillHold({
        customerId: info.customerId,
        trackingNumber: info.trackingNumber,
        appointmentId: bill.appointmentId,
        billId: bill.id,
      }).catch(console.error);
    }

    if (newStatus === 'PAID') {
      mobilePaymentsTriggers.onFinalBillPaid({
        customerId: info.customerId,
        trackingNumber: info.trackingNumber,
        appointmentId: bill.appointmentId,
        billId: bill.id,
      }).catch(console.error);

      paymentsTriggers.onPaymentCompleted({
        trackingNumber: info.trackingNumber,
        customerName: info.customerName,
      }).catch(console.error);
    }
  } catch (error) {
    console.error('[final-bill-status] notification error:', error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid bill ID' },
      { status: 400 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: true, errorMessage: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const requestedStatus =
    typeof body?.status === 'string'
      ? body.status.toUpperCase()
      : '';

  const validStatuses = [
    'PENDING',
    'PARKED',
    'OFFICIAL',
    'PAID',
  ];

  if (!validStatuses.includes(requestedStatus)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid status. Allowed: PENDING, PARKED, OFFICIAL, PAID.',
      },
      { status: 422 },
    );
  }

  try {
    const [bill] = await Database.select()
      .from(FinalBill)
      .where(eq(FinalBill.id, id));

    if (!bill) {
      return NextResponse.json(
        {
          error: true,
          errorMessage: 'Final bill not found.',
        },
        { status: 404 },
      );
    }

    const currentStatus = bill.status;

    if (currentStatus === requestedStatus) {
      return NextResponse.json(
        {
          error: true,
          errorMessage: `Bill is already ${requestedStatus}.`,
        },
        { status: 422 },
      );
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(requestedStatus)) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            `Cannot transition from ${currentStatus} to ${requestedStatus}.`,
        },
        { status: 422 },
      );
    }

    /* ============================================================
       PARK VEHICLE
       PENDING -> PARKED
    ============================================================ */
    if (requestedStatus === 'PARKED') {
      const config = await getPaymentConfig();
      const addParkingFee = body?.addParkingFee !== false;
      const now = new Date();
      const snapshotRate = addParkingFee
        ? config.parkingFeePerDay
        : 0;

      const updated = await Database.update(FinalBill)
        .set({
          status: 'PARKED',
          parkedAt: now,
          parkingFeeEnabled: addParkingFee,
          parkingFeeRate: snapshotRate.toFixed(2),
          updatedAt: now,
        })
        .where(
          and(
            eq(FinalBill.id, id),
            eq(FinalBill.status, 'PENDING'),
          ),
        )
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          {
            error: true,
            errorMessage:
              'This Final Bill was changed by another user. Refresh and try again.',
          },
          { status: 409 },
        );
      }

      await notifyStatusChange(updated[0], 'PARKED');

      return NextResponse.json(
        {
          error: false,
          message: 'Vehicle parked successfully.',
          data: {
            id,
            status: 'PARKED',
            parkingFeeEnabled: addParkingFee,
            parkingFeeRate: snapshotRate,
            parkedAt: now.toISOString(),
          },
        },
        { status: 200 },
      );
    }

    /* ============================================================
       STOP PARKING
       PARKED -> PENDING

       Calculation rule:
       - whole billable days
       - any partial day counts as one day
       - minimum is one day

       The complete stop operation is wrapped in a transaction so a
       second concurrent request cannot create a duplicate parking fee.
    ============================================================ */
    if (
      requestedStatus === 'PENDING' &&
      currentStatus === 'PARKED'
    ) {
      let parkingResult: {
        bill: any;
        billableDays: number;
        parkingFee: number;
        rate: number;
        parkedAt: Date;
      };

      try {
        parkingResult = await Database.transaction(async (tx) => {
          const [currentBill] = await tx
            .select()
            .from(FinalBill)
            .where(eq(FinalBill.id, id));

          if (!currentBill || currentBill.status !== 'PARKED') {
            throw new ParkingStateError(
              'This vehicle is no longer parked. Refresh the Final Bill and try again.',
            );
          }

          if (!currentBill.parkedAt) {
            throw new ParkingStateError(
              'Parked vehicle has no parking start time.',
            );
          }

          const parkedAt = new Date(currentBill.parkedAt);

          if (Number.isNaN(parkedAt.getTime())) {
            throw new ParkingStateError(
              'Parking start time is invalid.',
            );
          }

          const now = new Date();
          const billableDays = getBillableDays(parkedAt, now);
          const rate = currentBill.parkingFeeEnabled
            ? toMoney(currentBill.parkingFeeRate)
            : 0;
          const parkingFee = Math.round(rate * billableDays * 100) / 100;

          let nextFeesTotal = toMoney(currentBill.feesTotal);
          let nextGrandTotal = toMoney(currentBill.grandTotal);

          if (parkingFee > 0) {
            await tx.insert(FinalBillFees).values({
              finalBillId: id,
              title: `Parking Fee (${billableDays} day${billableDays === 1 ? '' : 's'})`,
              amount: parkingFee.toFixed(2),
            });

            nextFeesTotal =
              Math.round((nextFeesTotal + parkingFee) * 100) / 100;
            nextGrandTotal =
              Math.round((nextGrandTotal + parkingFee) * 100) / 100;
          }

          const [updatedBill] = await tx
            .update(FinalBill)
            .set({
              status: 'PENDING',
              parkedAt: null,
              parkingFeeEnabled: false,
              parkingFeeRate: null,
              feesTotal: nextFeesTotal.toFixed(2),
              grandTotal: nextGrandTotal.toFixed(2),
              updatedAt: now,
            })
            .where(
              and(
                eq(FinalBill.id, id),
                eq(FinalBill.status, 'PARKED'),
              ),
            )
            .returning();

          if (!updatedBill) {
            throw new ParkingStateError(
              'This vehicle was already unparked by another user. Refresh the Final Bill and try again.',
            );
          }

          return {
            bill: updatedBill,
            billableDays,
            parkingFee,
            rate,
            parkedAt,
          };
        });
      } catch (error) {
        if (error instanceof ParkingStateError) {
          return NextResponse.json(
            {
              error: true,
              errorMessage: error.message,
            },
            { status: 409 },
          );
        }

        throw error;
      }

      await notifyStatusChange(
        parkingResult.bill,
        'PENDING',
      );

      return NextResponse.json(
        {
          error: false,
          message: 'Parking stopped successfully.',
          data: {
            id,
            status: 'PENDING',
            billableDays: parkingResult.billableDays,
            parkingFee: parkingResult.parkingFee,
            rate: parkingResult.rate,
            parkedAt: parkingResult.parkedAt,
          },
        },
        { status: 200 },
      );
    }

    /* ============================================================
       OTHER TRANSITIONS
    ============================================================ */
    const updated = await Database.update(FinalBill)
      .set({
        status: requestedStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(FinalBill.id, id),
          eq(FinalBill.status, currentStatus),
        ),
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'This Final Bill was changed by another user. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    await notifyStatusChange(updated[0], requestedStatus);

    return NextResponse.json(
      {
        error: false,
        message:
          `Final bill status updated to ${requestedStatus}.`,
        data: {
          id,
          status: requestedStatus,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      '[PATCH /api/payments/final-bills/[id]/status] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Database error',
        errorMessage: 'Could not update bill status.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
