import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/staffs/auth';

import {
  Database,
} from '@/lib/drizzle';

import {
  EstimatedCosts,
} from '@/database/models/payments/estimated-costs.model';

import {
  WorkTasks,
} from '@/database/models/service-tracking/work-tasks.model';

import { areAllWorkTasksFinished } from '@/lib/service-tracking/work-completion';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  eq,
  and,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  generateFinalBill,
} from '@/utils/final-bill';

import {
  getAppointmentInfo,
} from '@/utils/payments/get-appointment-info';

import {
  paymentsTriggers,
} from '@/triggers/payments';

import {
  mobilePaymentsTriggers,
} from '@/app-triggers/payments';

import {
  markAppointmentInventoryUsed,
} from '@/utils/inventory/appointment-inventory';

import {
  inventoryTriggers,
} from '@/triggers/inventory';

export async function POST(
  req: NextRequest,
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Staff login required.' }, { status: 401 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid JSON',
        errorMessage:
          'Request body must be valid JSON.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      { status: 400 },
    );
  }

  const {
    appointmentId,
  } = body ?? {};

  if (
    !appointmentId ||
    !isValidUUID(appointmentId)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle:
          'Invalid appointment',
        errorMessage:
          'appointmentId is required and must be a valid UUID.',
        errorLog: null,
      },
      { status: 422 },
    );
  }

  try {
    // Reject stale/repeated requests and prevent Final Cost generation before
    // the appointment actually reaches the repair stage.
    const [currentAppointment] = await Database
      .select({ status: Appointments.status })
      .from(Appointments)
      .where(eq(Appointments.id, appointmentId))
      .limit(1);

    if (!currentAppointment) {
      return NextResponse.json({
        error: true,
        errorTitle: 'Appointment not found',
        errorMessage: 'The appointment no longer exists.',
      }, { status: 404 });
    }

    if (currentAppointment.status !== 'IN_PROGRESS') {
      return NextResponse.json({
        error: true,
        errorTitle: 'Service is not in progress',
        errorMessage: 'Only an in-progress service can be completed. Refresh Service Tracking.',
      }, { status: 409 });
    }

    /* ==============================================================
       1. Check all work tasks are complete
    ============================================================== */

    const workTasks =
      await Database
        .select()
        .from(WorkTasks)
        .where(
          eq(
            WorkTasks.appointmentId,
            appointmentId,
          ),
        );

    if (!areAllWorkTasksFinished(workTasks)) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'fve',
          errorTitle:
            'Work not complete',
          errorMessage:
            'At least one work task is required, and every work task must be DONE before generating the Final Cost.',
          errorLog: null,
        },
        { status: 422 },
      );
    }

    /* ==============================================================
       2. Get the approved estimate
    ============================================================== */

    const [estimate] =
      await Database
        .select()
        .from(EstimatedCosts)
        .where(
          and(
            eq(
              EstimatedCosts.appointmentId,
              appointmentId,
            ),
            eq(
              EstimatedCosts.status,
              'APPROVED',
            ),
          ),
        )
        .limit(1);

    if (!estimate) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle:
            'No approved estimate',
          errorMessage:
            'This appointment does not have an approved estimate.',
          errorLog: null,
        },
        { status: 404 },
      );
    }

    /* ==============================================================
       3. Generate Final Cost

       generateFinalBill creates a snapshot of the approved estimate,
       including findings, every finding part/item, fees, discounts,
       and completed inspection tasks.
    ============================================================== */

    const finalBill =
      await generateFinalBill(
        appointmentId,
        estimate.id,
      );

    /* ==============================================================
       4. Complete appointment
    ============================================================== */

    await Database
      .update(Appointments)
      .set({
        status: 'COMPLETED',
        updatedAt:
          new Date(),
      })
      .where(
        eq(
          Appointments.id,
          appointmentId,
        ),
      );

    /* ==============================================================
       5. Move KEPT inventory to USED

       Inventory quantity is not added back here. The quantity was
       already removed when the estimate was submitted to billing.
    ============================================================== */

    const usedInventory =
      await markAppointmentInventoryUsed(
        Database,
        appointmentId,
      );

    if (
      usedInventory.length > 0
    ) {
      const totalQuantity =
        usedInventory.reduce(
          (
            sum: number,
            item: any,
          ) =>
            sum +
            (Number(
              item.quantity,
            ) || 0),
          0,
        );

      inventoryTriggers
        .onUsed({
          itemName:
            `${usedInventory.length} item(s) for appointment ${appointmentId}`,
          quantity:
            totalQuantity,
        })
        .catch(console.error);
    }

    /* ==============================================================
       6. Notifications
    ============================================================== */

    const info =
      await getAppointmentInfo(
        appointmentId,
      );

    mobilePaymentsTriggers
      .onFinalBillGenerated({
        customerId:
          info.customerId,
        trackingNumber:
          info.trackingNumber,
        appointmentId,
        billId:
          finalBill.id,
      })
      .catch(console.error);

    paymentsTriggers
      .onFinalBillGenerated({
        trackingNumber:
          info.trackingNumber,
        customerName:
          info.customerName,
      })
      .catch(console.error);

    return NextResponse.json(
      {
        error: false,
        message:
          'Final Cost generated.',
        data: finalBill,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(
      '[POST /api/service-tracking/final-bill] Error:',
      e,
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Could not generate Final Cost.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      { status: 500 },
    );
  }
}
