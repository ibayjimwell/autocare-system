// app/api/payments/final-bills/[id]/verify-payment/route.ts

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  Database,
} from '@/lib/drizzle';

import {
  FinalBill,
} from '@/database/models/payments/final-bill.model';

import {
  Appointments,
} from '@/database/models/appointments/appointments.model';

import {
  Customers,
} from '@/database/models/customers/customers.model';

import {
  eq,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  getPaymentLinkStatus,
} from '@/lib/paymongo';

import {
  generatePaymentReceipt,
} from '@/utils/payments/generate-payment-receipt';

import {
  mobilePaymentsTriggers,
} from '@/app-triggers/payments';

// --------------------------------------------------------------
// POST /api/payments/final-bills/[id]/verify-payment
// --------------------------------------------------------------
export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id: billId } =
    await params;

  if (!isValidUUID(billId)) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid bill ID',
      },
      {
        status: 400,
      },
    );
  }

  let body;

  try {
    body =
      await req.json();
  } catch (error) {
    console.error(
      '[VerifyPayment] Invalid JSON body:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid request body.',
      },
      {
        status: 400,
      },
    );
  }

  const {
    paymongoLinkId,
  } =
    body ?? {};

  if (
    typeof paymongoLinkId !==
      'string' ||
    !paymongoLinkId.trim()
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Missing paymongoLinkId',
      },
      {
        status: 400,
      },
    );
  }

  // Check current bill status
  const [bill] =
    await Database
      .select()
      .from(FinalBill)
      .where(
        eq(
          FinalBill.id,
          billId,
        ),
      )
      .limit(1);

  if (!bill) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Final Cost not found',
      },
      {
        status: 404,
      },
    );
  }

  /*
   * Idempotent behavior:
   *
   * If another verification/webhook already marked the bill PAID,
   * don't try to process the same payment again.
   */
  if (
    bill.status ===
    'PAID'
  ) {
    return NextResponse.json(
      {
        error: false,
        message:
          'Bill already paid',
        paid: true,
        referenceNumber:
          null,
      },
      {
        status: 200,
      },
    );
  }

  // Verify with PayMongo
  let linkStatus;

  try {
    linkStatus =
      await getPaymentLinkStatus(
        paymongoLinkId.trim(),
      );
  } catch (err) {
    console.error(
      '[VerifyPayment] PayMongo error:',
      err,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to verify payment at this time.',
      },
      {
        status: 502,
      },
    );
  }

  if (!linkStatus.isPaid) {
    return NextResponse.json(
      {
        error: false,
        paid: false,
        message:
          'Payment not yet completed.',
      },
      {
        status: 200,
      },
    );
  }

  /*
   * PayMongo has confirmed that the payment is successful.
   *
   * Keep receipt generation separate from the PAID update.
   * This guarantees the Final Cost can still become PAID even if
   * receipt generation has an unrelated failure.
   */
  let referenceNumber =
    linkStatus.referenceNumber ??
    null;

  let receiptData =
    null;

  let receiptWarning =
    null;

  try {
    const receiptResult =
      await generatePaymentReceipt(
        billId,
      );

    referenceNumber =
      receiptResult?.referenceNumber ??
      referenceNumber;

    receiptData =
      receiptResult?.receiptData ??
      null;
  } catch (err) {
    console.error(
      '[VerifyPayment] Receipt generation failed:',
      err,
    );

    receiptWarning =
      err instanceof Error
        ? err.message
        : 'Payment succeeded but receipt generation failed.';
  }

  /*
   * IMPORTANT:
   *
   * Explicitly persist PAID.
   *
   * The previous implementation relied on
   * generatePaymentReceipt() to perform this update.
   * That created a failure point where PayMongo was paid but
   * final_bills.status could remain OFFICIAL.
   */
  let updatedBill;

  try {
    const result =
      await Database
        .update(FinalBill)
        .set({
          status: 'PAID',
        })
        .where(
          eq(
            FinalBill.id,
            billId,
          ),
        )
        .returning();

    updatedBill =
      result?.[0] ?? null;
  } catch (err) {
    console.error(
      '[VerifyPayment] Failed to mark Final Cost as PAID:',
      err,
    );

    return NextResponse.json(
      {
        error: true,
        paid: false,
        errorMessage:
          'PayMongo confirmed the payment, but the Final Cost could not be marked as PAID.',
      },
      {
        status: 500,
      },
    );
  }

  if (!updatedBill) {
    return NextResponse.json(
      {
        error: true,
        paid: false,
        errorMessage:
          'PayMongo confirmed the payment, but the Final Cost could not be updated.',
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Send the customer notification only after the database
   * successfully contains the PAID state.
   */
  try {
    const [appointment] =
      await Database
        .select()
        .from(Appointments)
        .where(
          eq(
            Appointments.id,
            bill.appointmentId,
          ),
        )
        .limit(1);

    if (appointment) {
      const [customer] =
        await Database
          .select()
          .from(Customers)
          .where(
            eq(
              Customers.id,
              appointment.customerId,
            ),
          )
          .limit(1);

      if (customer) {
        mobilePaymentsTriggers
          .onFinalBillPaid({
            customerId:
              customer.id,

            trackingNumber:
              appointment.trackingNumber,

            appointmentId:
              bill.appointmentId,

            billId:
              billId,
          })
          .catch(
            console.error,
          );
      }
    }
  } catch (notificationError) {
    /*
     * Notification failure must never undo a successful payment.
     */
    console.error(
      '[VerifyPayment] Payment notification failed:',
      notificationError,
    );
  }

  /*
   * The payment itself has succeeded.
   *
   * Return HTTP 200 even if receipt generation had a warning.
   * This prevents the mobile app from incorrectly displaying
   * the payment as failed after the database has already changed
   * to PAID.
   */
  return NextResponse.json(
    {
      error: false,

      paid: true,

      message:
        receiptWarning
          ? 'Payment verified and Final Cost marked as paid. Receipt generation requires attention.'
          : 'Payment verified and processed.',

      referenceNumber,

      receiptData,

      receiptWarning,
    },
    {
      status: 200,
    },
  );
}