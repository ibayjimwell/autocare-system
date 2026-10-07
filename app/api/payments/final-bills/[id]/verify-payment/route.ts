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
  getPaymongoPaymentIntent,
} from '@/lib/paymongo';

import {
  generatePaymentReceipt,
} from '@/utils/payments/generate-payment-receipt';

import {
  mobilePaymentsTriggers,
} from '@/app-triggers/payments';

/* ============================================================================
   HELPERS
============================================================================ */

function getPaymentIntentId(
  value: unknown,
) {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !normalized.startsWith(
      'pi_',
    )
  ) {
    return null;
  }

  return normalized;
}

function getIntentAttributes(
  response: any,
) {
  return (
    response?.data
      ?.attributes ??
    response?.attributes ??
    {}
  );
}

function getIntentMetadata(
  response: any,
) {
  const metadata =
    getIntentAttributes(
      response,
    )?.metadata;

  return (
    metadata &&
    typeof metadata ===
      'object'
  )
    ? metadata
    : {};
}

function getIntentPaymentMethod(
  response: any,
) {
  const attributes =
    getIntentAttributes(
      response,
    );

  const allowed =
    attributes
      ?.payment_method_allowed;

  if (
    Array.isArray(
      allowed,
    ) &&
    typeof allowed[0] ===
      'string'
  ) {
    return allowed[0]
      .trim()
      .toLowerCase();
  }

  return null;
}

/* ============================================================================
   POST /api/payments/final-bills/[id]/verify-payment
============================================================================ */

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
  const {
    id: billId,
  } =
    await params;

  /* --------------------------------------------------------------------------
     VALIDATE BILL ID
  -------------------------------------------------------------------------- */

  if (
    !isValidUUID(
      billId,
    )
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Invalid bill ID',
      },
      {
        status:
          400,
      },
    );
  }

  /* --------------------------------------------------------------------------
     REQUEST BODY
  -------------------------------------------------------------------------- */

  let body:
    unknown;

  try {
    body =
      await req.json();
  } catch {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Invalid request body.',
      },
      {
        status:
          400,
      },
    );
  }

  const paymentIntentId =
    getPaymentIntentId(
      (
        body as
          | Record<
              string,
              unknown
            >
          | null
      )
        ?.paymentIntentId,
    );

  if (
    !paymentIntentId
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Missing or invalid paymentIntentId.',
      },
      {
        status:
          400,
      },
    );
  }

  /* --------------------------------------------------------------------------
     LOAD FINAL BILL
  -------------------------------------------------------------------------- */

  let bill:
    typeof FinalBill.$inferSelect |
    null =
    null;

  try {
    const [row] =
      await Database
        .select()
        .from(
          FinalBill,
        )
        .where(
          eq(
            FinalBill.id,
            billId,
          ),
        )
        .limit(1);

    bill =
      row ??
      null;
  } catch (
    error
  ) {
    console.error(
      '[VerifyPayment] Final Cost lookup failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Unable to retrieve the Final Cost for payment verification.',
      },
      {
        status:
          500,
      },
    );
  }

  if (!bill) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Final Cost not found',
      },
      {
        status:
          404,
      },
    );
  }

  /*
   * OFFICIAL = normal QRPh completion.
   *
   * PAID is also allowed here because:
   *
   * - webhook may have completed first
   * - an older broken online-payment attempt may have PAID status but
   *   no receipt
   *
   * We still verify the Payment Intent before returning success.
   */
  if (
    bill.status !==
      'OFFICIAL' &&
    bill.status !==
      'PAID'
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          `This bill is currently ${bill.status} and is not ready for payment.`,
      },
      {
        status:
          422,
      },
    );
  }

  /* --------------------------------------------------------------------------
     RETRIEVE PAYMENT INTENT SERVER-SIDE

     Never trust payment success supplied by the mobile client.
  -------------------------------------------------------------------------- */

  let paymentIntent:
    any;

  try {
    paymentIntent =
      await getPaymongoPaymentIntent(
        paymentIntentId,
      );
  } catch (
    error
  ) {
    console.error(
      '[VerifyPayment] PayMongo Payment Intent retrieval failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Unable to verify the payment with PayMongo right now.',
      },
      {
        status:
          502,
      },
    );
  }

  const intentAttributes =
    getIntentAttributes(
      paymentIntent,
    );

  const metadata =
    getIntentMetadata(
      paymentIntent,
    );

  /* --------------------------------------------------------------------------
     VERIFY OWNERSHIP
  -------------------------------------------------------------------------- */

  if (
    metadata
      ?.final_bill_id !==
    billId
  ) {
    console.error(
      '[VerifyPayment] Payment Intent does not belong to Final Cost:',
      {
        billId,
        paymentIntentId,
        metadataFinalBillId:
          metadata
            ?.final_bill_id,
      },
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment verification failed because the payment does not belong to this Final Cost.',
      },
      {
        status:
          403,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY AMOUNT
  -------------------------------------------------------------------------- */

  const expectedAmount =
    Math.round(
      (
        Number.parseFloat(
          String(
            bill.grandTotal ??
              0,
          ),
        ) ||
        0
      ) *
        100,
    );

  const remoteAmount =
    Number(
      intentAttributes
        ?.amount ??
        0,
    );

  if (
    expectedAmount <=
      0 ||
    remoteAmount !==
      expectedAmount
  ) {
    console.error(
      '[VerifyPayment] Payment amount mismatch:',
      {
        billId,
        paymentIntentId,
        expectedAmount,
        remoteAmount,
      },
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment verification failed because the payment amount does not match the Final Cost.',
      },
      {
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY CURRENCY
  -------------------------------------------------------------------------- */

  const remoteCurrency =
    String(
      intentAttributes
        ?.currency ??
        'PHP',
    )
      .trim()
      .toUpperCase();

  if (
    remoteCurrency !==
    'PHP'
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment verification failed because the payment currency is not PHP.',
      },
      {
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY PAYMENT METHOD
  -------------------------------------------------------------------------- */

  const paymentMethod =
    getIntentPaymentMethod(
      paymentIntent,
    );

  const expectedPaymentMethod =
    typeof metadata
      ?.payment_method ===
      'string'
      ? metadata
          .payment_method
          .trim()
          .toLowerCase()
      : null;

  if (
    expectedPaymentMethod &&
    paymentMethod &&
    expectedPaymentMethod !==
      paymentMethod
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment verification failed because the payment method does not match the payment session.',
      },
      {
        status:
          409,
      },
    );
  }

  /*
   * AutoCare currently allows QRPh only.
   */
  if (
    paymentMethod &&
    paymentMethod !==
      'qrph'
  ) {
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment verification failed because this payment is not QRPh.',
      },
      {
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY PAYMONGO STATUS
  -------------------------------------------------------------------------- */

  const intentStatus =
    String(
      intentAttributes
        ?.status ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    intentStatus !==
    'succeeded'
  ) {
    return NextResponse.json(
      {
        error:
          false,

        paid:
          false,

        status:
          intentStatus ||
          'unknown',

        message:
          'Payment has not completed yet.',
      },
      {
        status:
          200,
      },
    );
  }

  /* --------------------------------------------------------------------------
     PAYMONGO CONFIRMED SUCCESS

     IMPORTANT:

     Do NOT manually update FinalBill to PAID here.

     generatePaymentReceipt() owns BOTH:

       receipt creation
       +
       OFFICIAL -> PAID

     inside one database transaction.
  -------------------------------------------------------------------------- */

  let receiptResult:
    Awaited<
      ReturnType<
        typeof generatePaymentReceipt
      >
    >;

  try {
    receiptResult =
      await generatePaymentReceipt(
        billId,
        {
          paymentMethod:
            'QRPH',

          paymentReference:
            paymentIntentId,

          idempotent:
            true,

          expectedStatus:
            'OFFICIAL',
        },
      );
  } catch (
    error
  ) {
    console.error(
      '[VerifyPayment] Payment finalization failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        paid:
          false,

        errorMessage:
          error instanceof
          Error
            ? error.message
            : 'PayMongo confirmed the payment, but AutoCare could not finalize the payment and receipt.',
      },
      {
        status:
          500,
      },
    );
  }

  /* --------------------------------------------------------------------------
     MOBILE CUSTOMER NOTIFICATION

     Only the request that actually CREATED the receipt sends the notification.

     If webhook already processed it:
       created = false

     so polling does not send another notification.
  -------------------------------------------------------------------------- */

  if (
    receiptResult.created
  ) {
    try {
      const [
        appointment,
      ] =
        await Database
          .select()
          .from(
            Appointments,
          )
          .where(
            eq(
              Appointments.id,
              bill.appointmentId,
            ),
          )
          .limit(1);

      if (
        appointment
      ) {
        const [
          customer,
        ] =
          await Database
            .select()
            .from(
              Customers,
            )
            .where(
              eq(
                Customers.id,
                appointment.customerId,
              ),
            )
            .limit(1);

        if (
          customer
        ) {
          mobilePaymentsTriggers
            .onFinalBillPaid({
              customerId:
                customer.id,

              trackingNumber:
                appointment.trackingNumber,

              appointmentId:
                bill.appointmentId,

              billId,
            })
            .catch(
              error => {
                console.error(
                  '[VerifyPayment] Mobile payment trigger failed:',
                  error,
                );
              },
            );
        }
      }
    } catch (
      notificationError
    ) {
      console.error(
        '[VerifyPayment] Payment notification failed:',
        notificationError,
      );
    }
  }

  /* --------------------------------------------------------------------------
     SUCCESS
  -------------------------------------------------------------------------- */

  return NextResponse.json(
    {
      error:
        false,

      paid:
        true,

      status:
        'succeeded',

      paymentIntentId,

      paymentMethod:
        'qrph',

      referenceNumber:
        receiptResult.referenceNumber,

      receiptData:
        receiptResult.receiptData,

      receiptCreated:
        receiptResult.created,

      alreadyProcessed:
        receiptResult.alreadyProcessed,

      message:
        receiptResult.created
          ? 'Payment verified. Final Cost marked as paid and receipt generated.'
          : 'Payment verified. Final Cost and receipt were already processed.',
    },
    {
      status:
        200,
    },
  );
}