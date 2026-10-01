import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

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
  and,
  eq,
  ne,
} from 'drizzle-orm';

import {
  getPaymongoPaymentIntent,
} from '@/lib/paymongo';

import {
  generatePaymentReceipt,
} from '@/utils/payments/generate-payment-receipt';

import {
  mobilePaymentsTriggers,
} from '@/app-triggers/payments';

const WEBHOOK_SECRET =
  process.env.PAYMONGO_WEBHOOK_SECRET;

const MAX_WEBHOOK_AGE_SECONDS =
  5 * 60;

function parseSignatureHeader(
  header: string,
) {
  const parts =
    header.split(',');

  const values: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    const separatorIndex =
      part.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = part
      .slice(0, separatorIndex)
      .trim();

    const value = part
      .slice(separatorIndex + 1)
      .trim();

    values[key] = value;
  }

  return {
    timestamp: values.t,
    testSignature: values.te,
    liveSignature: values.li,
  };
}

function safeEqual(
  expected: string,
  actual: string,
) {
  const expectedBuffer =
    Buffer.from(expected, 'utf8');
  const actualBuffer =
    Buffer.from(actual, 'utf8');

  if (
    expectedBuffer.length !==
    actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    actualBuffer,
  );
}

function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string,
) {
  if (!WEBHOOK_SECRET) {
    throw new Error(
      'PAYMONGO_WEBHOOK_SECRET is not configured.',
    );
  }

  const {
    timestamp,
    testSignature,
    liveSignature,
  } = parseSignatureHeader(
    signatureHeader,
  );

  if (!timestamp) {
    return false;
  }

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber,
    )
  ) {
    return false;
  }

  const age =
    Math.abs(
      Math.floor(
        Date.now() / 1000,
      ) - timestampNumber,
    );

  if (
    age >
    MAX_WEBHOOK_AGE_SECONDS
  ) {
    return false;
  }

  /*
   * PayMongo's current webhook signature format signs:
   *   timestamp + '.' + raw request body
   *
   * The `li` signature is used for live events, while `te` is used
   * for test events. We accept either because the same handler can be
   * configured for one environment at a time and PayMongo provides the
   * matching signature in the header.
   */
  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature =
    createHmac(
      'sha256',
      WEBHOOK_SECRET,
    )
      .update(signedPayload)
      .digest('hex');

  return (
    (testSignature &&
      safeEqual(
        expectedSignature,
        testSignature,
      )) ||
    (liveSignature &&
      safeEqual(
        expectedSignature,
        liveSignature,
      ))
  );
}

export async function POST(
  req: NextRequest,
) {
  const rawBody =
    await req.text();

  const signature =
    req.headers.get(
      'paymongo-signature',
    ) ??
    req.headers.get(
      'Paymongo-Signature',
    );

  if (!signature) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Missing PayMongo webhook signature.',
      },
      {
        status: 401,
      },
    );
  }

  let signatureValid =
    false;

  try {
    signatureValid =
      verifyPayMongoSignature(
        rawBody,
        signature,
      );
  } catch (error) {
    console.error(
      '[PayMongo Webhook] Signature configuration error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Webhook verification is not configured.',
      },
      {
        status: 500,
      },
    );
  }

  if (!signatureValid) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid PayMongo webhook signature.',
      },
      {
        status: 401,
      },
    );
  }

  let event: any;

  try {
    event = JSON.parse(
      rawBody,
    );
  } catch {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Invalid webhook JSON.',
      },
      {
        status: 400,
      },
    );
  }

  const eventType =
    event?.data?.attributes
      ?.type;

  if (
    eventType !==
      'payment.paid' &&
    eventType !==
      'payment.failed'
  ) {
    return NextResponse.json(
      {
        received: true,
        ignored: true,
      },
      {
        status: 200,
      },
    );
  }

  if (
    eventType ===
    'payment.failed'
  ) {
    return NextResponse.json(
      {
        received: true,
        processed: false,
        event: eventType,
      },
      {
        status: 200,
      },
    );
  }

  const paymentIntentId =
    event?.data?.attributes
      ?.data?.attributes
      ?.payment_intent_id ??
    event?.data?.attributes
      ?.payment_intent_id;

  if (
    typeof paymentIntentId !==
      'string' ||
    !paymentIntentId.startsWith(
      'pi_',
    )
  ) {
    /*
     * This webhook is dedicated to the Payment Intent flow. Other
     * PayMongo payment events may not contain a Payment Intent ID.
     * Ignore those safely so they are not retried forever.
     */
    return NextResponse.json(
      {
        received: true,
        ignored: true,
        reason:
          'No Payment Intent ID in payment.paid event.',
      },
      {
        status: 200,
      },
    );
  }

  try {
    const paymentIntent =
      await getPaymongoPaymentIntent(
        paymentIntentId,
      );

    const attributes =
      paymentIntent?.data
        ?.attributes ?? {};

    if (
      String(
        attributes?.status ??
          '',
      ).toLowerCase() !==
      'succeeded'
    ) {
      return NextResponse.json(
        {
          received: true,
          processed: false,
          message:
            'Payment event received, but Payment Intent is not succeeded.',
        },
        {
          status: 200,
        },
      );
    }

    const finalBillId =
      attributes?.metadata
        ?.final_bill_id;

    if (
      typeof finalBillId !==
        'string'
    ) {
      console.error(
        '[PayMongo Webhook] Payment Intent is missing final_bill_id metadata.',
      );

      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Payment Intent metadata is incomplete.',
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
            finalBillId,
          ),
        )
        .limit(1);

    if (!bill) {
      console.error(
        '[PayMongo Webhook] Final Cost not found for Payment Intent.',
        {
          finalBillId,
          paymentIntentId,
        },
      );

      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Final Cost not found.',
        },
        {
          status: 404,
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
        attributes?.amount ?? 0,
      );

    if (
      expectedAmount !==
      remoteAmount
    ) {
      console.error(
        '[PayMongo Webhook] Payment amount mismatch.',
        {
          finalBillId,
          paymentIntentId,
          expectedAmount,
          remoteAmount,
        },
      );

      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Payment amount does not match Final Cost.',
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Only transition a non-PAID Final Cost. This makes duplicate
     * payment.paid deliveries safe without requiring a new table just
     * for webhook event IDs.
     */
    const updated =
      await Database
        .update(FinalBill)
        .set({
          status: 'PAID',
        })
        .where(
          and(
            eq(
              FinalBill.id,
              finalBillId,
            ),
            ne(
              FinalBill.status,
              'PAID',
            ),
          ),
        )
        .returning();

    if (!updated.length) {
      return NextResponse.json(
        {
          received: true,
          processed: true,
          alreadyPaid: true,
        },
        {
          status: 200,
        },
      );
    }

    let receiptWarning =
      null;

    try {
      await generatePaymentReceipt(
        finalBillId,
      );
    } catch (error) {
      console.error(
        '[PayMongo Webhook] Receipt generation failed:',
        error,
      );

      receiptWarning =
        error instanceof Error
          ? error.message
          : 'Payment succeeded but receipt generation failed.';
    }

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
                finalBillId,
            })
            .catch(
              console.error,
            );
        }
      }
    } catch (notificationError) {
      console.error(
        '[PayMongo Webhook] Payment notification failed:',
        notificationError,
      );
    }

    return NextResponse.json(
      {
        received: true,
        processed: true,
        receiptWarning,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      '[PayMongo Webhook] Processing failed:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unable to process PayMongo payment event.',
      },
      {
        status: 500,
      },
    );
  }
}
