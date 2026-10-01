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

function getPaymentIntentId(
  value: unknown,
) {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !normalized.startsWith('pi_')
  ) {
    return null;
  }

  return normalized;
}

function getIntentAttributes(
  response: any,
) {
  return (
    response?.data?.attributes ??
    response?.attributes ??
    {}
  );
}

function getIntentMetadata(
  response: any,
) {
  return (
    getIntentAttributes(
      response,
    )?.metadata ?? {}
  );
}

function getIntentPaymentMethod(
  response: any,
) {
  const attributes =
    getIntentAttributes(
      response,
    );

  return (
    attributes?.payment_method_allowed?.[0] ??
    null
  );
}

// -----------------------------------------------------------------------------
// POST /api/payments/final-bills/[id]/verify-payment
// -----------------------------------------------------------------------------
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

  let body: unknown;

  try {
    body = await req.json();
  } catch {
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

  const paymentIntentId =
    getPaymentIntentId(
      (body as Record<string, unknown> | null)
        ?.paymentIntentId,
    );

  if (!paymentIntentId) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Missing or invalid paymentIntentId.',
      },
      {
        status: 400,
      },
    );
  }

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

  if (
    bill.status ===
    'PAID'
  ) {
    return NextResponse.json(
      {
        error: false,
        paid: true,
        message:
          'Bill already paid',
        referenceNumber:
          null,
      },
      {
        status: 200,
      },
    );
  }

  if (
    bill.status !==
    'OFFICIAL'
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          `This bill is currently ${bill.status} and is not ready for payment.`,
      },
      {
        status: 422,
      },
    );
  }

  /*
   * Retrieve the Payment Intent with the server-side secret key.
   * Never trust the payment result supplied by the mobile client.
   */
  let paymentIntent;

  try {
    paymentIntent =
      await getPaymongoPaymentIntent(
        paymentIntentId,
      );
  } catch (error) {
    console.error(
      '[VerifyPayment] PayMongo Payment Intent retrieval failed:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to verify the payment with PayMongo right now.',
      },
      {
        status: 502,
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

  /*
   * Bind the remote Payment Intent to this exact Final Cost.
   * This prevents a client from submitting another bill's Payment Intent.
   */
  if (
    metadata?.final_bill_id !==
    billId
  ) {
    console.error(
      '[VerifyPayment] Payment Intent does not belong to Final Cost:',
      {
        billId,
        paymentIntentId,
      },
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Payment verification failed because the payment does not belong to this Final Cost.',
      },
      {
        status: 403,
      },
    );
  }

  const expectedAmount =
    Math.round(
      (Number.parseFloat(
        String(
          bill.grandTotal ?? 0,
        ),
      ) || 0) * 100,
    );

  const remoteAmount =
    Number(
      intentAttributes?.amount ??
        0,
    );

  if (
    expectedAmount <= 0 ||
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
        error: true,
        errorMessage:
          'Payment verification failed because the payment amount does not match the Final Cost.',
      },
      {
        status: 409,
      },
    );
  }

  const paymentMethod =
    getIntentPaymentMethod(
      paymentIntent,
    );

  const expectedPaymentMethod =
    metadata?.payment_method;

  if (
    expectedPaymentMethod &&
    paymentMethod &&
    expectedPaymentMethod !==
      paymentMethod
  ) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Payment verification failed because the payment method does not match the payment session.',
      },
      {
        status: 409,
      },
    );
  }

  const intentStatus =
    String(
      intentAttributes?.status ??
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
        error: false,
        paid: false,
        status:
          intentStatus ||
          'unknown',
        message:
          'Payment has not completed yet.',
      },
      {
        status: 200,
      },
    );
  }

  /*
   * PayMongo has confirmed that the Payment Intent succeeded.
   * Persist PAID before any optional notification work.
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
  } catch (error) {
    console.error(
      '[VerifyPayment] Failed to mark Final Cost as PAID:',
      error,
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

  let referenceNumber = null;
  let receiptData = null;
  let receiptWarning = null;

  try {
    const receiptResult =
      await generatePaymentReceipt(
        billId,
      );

    referenceNumber =
      receiptResult?.referenceNumber ??
      null;

    receiptData =
      receiptResult?.receiptData ??
      null;
  } catch (error) {
    console.error(
      '[VerifyPayment] Receipt generation failed:',
      error,
    );

    receiptWarning =
      error instanceof Error
        ? error.message
        : 'Payment succeeded but receipt generation failed.';
  }

  /*
   * Notify the customer after PAID has been persisted.
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
            billId,
          })
          .catch(
            console.error,
          );
      }
    }
  } catch (notificationError) {
    console.error(
      '[VerifyPayment] Payment notification failed:',
      notificationError,
    );
  }

  return NextResponse.json(
    {
      error: false,
      paid: true,
      paymentIntentId,
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
