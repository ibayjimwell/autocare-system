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
  const parts = header.split(',');

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

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const age = Math.abs(
    Math.floor(Date.now() / 1000) -
      timestampNumber,
  );

  if (age > MAX_WEBHOOK_AGE_SECONDS) {
    return false;
  }

  /*
   * PayMongo signs:
   *   timestamp + '.' + raw request body
   *
   * Test events use `te`; live events use `li`.
   * This handler accepts either populated field because the webhook
   * endpoint itself is scoped to a specific PayMongo mode.
   */
  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature =
    createHmac('sha256', WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

  return Boolean(
    (testSignature &&
      safeEqual(
        expectedSignature,
        testSignature,
      )) ||
      (liveSignature &&
        safeEqual(
          expectedSignature,
          liveSignature,
        )),
  );
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function getEventType(event: any) {
  return normalizeString(
    event?.data?.attributes?.type,
  );
}

function getWebhookPaymentIntentId(
  event: any,
  eventType: string | null,
) {
  const resourceAttributes =
    event?.data?.attributes?.data
      ?.attributes ?? {};

  const resource =
    event?.data?.attributes?.data ?? {};

  const candidates = [
    resourceAttributes?.payment_intent_id,
    resourceAttributes?.payment_intent?.id,
    event?.data?.attributes
      ?.payment_intent_id,
    event?.data?.attributes
      ?.payment_intent?.id,
  ];

  if (
    eventType ===
    'payment_intent.succeeded'
  ) {
    candidates.unshift(
      event?.data?.attributes?.data?.id,
      event?.data?.id,
    );
  }

  for (const candidate of candidates) {
    const value = normalizeString(candidate);

    if (value?.startsWith('pi_')) {
      return value;
    }
  }

  /*
   * `payment.paid` has the payment resource at
   * data.attributes.data. The Payment Intent ID is normally inside
   * that resource's attributes.
   */
  if (
    resource?.type === 'payment_intent' &&
    typeof resource?.id === 'string' &&
    resource.id.startsWith('pi_')
  ) {
    return resource.id;
  }

  return null;
}

function getWebhookFinalBillId(
  event: any,
  paymentIntent: any,
) {
  const paymentIntentMetadata =
    paymentIntent?.data?.attributes
      ?.metadata ??
    paymentIntent?.attributes?.metadata ??
    {};

  const paymentResourceMetadata =
    event?.data?.attributes?.data
      ?.attributes?.metadata ?? {};

  const candidates = [
    paymentIntentMetadata?.final_bill_id,
    paymentResourceMetadata?.final_bill_id,
    event?.data?.attributes?.metadata
      ?.final_bill_id,
  ];

  for (const candidate of candidates) {
    const value = normalizeString(candidate);

    if (value) {
      return value;
    }
  }

  return null;
}

function getWebhookAmount(
  event: any,
  paymentIntent: any,
) {
  const paymentIntentAmount =
    paymentIntent?.data?.attributes
      ?.amount ??
    paymentIntent?.attributes?.amount;

  const webhookPaymentAmount =
    event?.data?.attributes?.data
      ?.attributes?.amount;

  return Number(
    paymentIntentAmount ??
      webhookPaymentAmount ??
      0,
  );
}

function getWebhookCurrency(
  event: any,
  paymentIntent: any,
) {
  const currency =
    paymentIntent?.data?.attributes
      ?.currency ??
    paymentIntent?.attributes?.currency ??
    event?.data?.attributes?.data
      ?.attributes?.currency ??
    'PHP';

  return String(currency)
    .trim()
    .toUpperCase();
}

export async function POST(
  req: NextRequest,
) {
  const rawBody = await req.text();

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

  let signatureValid = false;

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
    event = JSON.parse(rawBody);
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

  const eventType = getEventType(event);

  /*
   * Accept both events because PayMongo exposes both the payment-level
   * success event and the Payment Intent success event. The webhook
   * dashboard must also be subscribed to the events you want delivered.
   */
  const supportedPaymentEvents =
    new Set([
      'payment.paid',
      'payment_intent.succeeded',
    ]);

  if (
    !eventType ||
    !supportedPaymentEvents.has(eventType)
  ) {
    if (eventType === 'payment.failed') {
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

  const paymentIntentId =
    getWebhookPaymentIntentId(
      event,
      eventType,
    );

  if (!paymentIntentId) {
    console.error(
      '[PayMongo Webhook] Successful payment event did not contain a Payment Intent ID.',
      {
        eventType,
      },
    );

    return NextResponse.json(
      {
        received: true,
        ignored: true,
        reason:
          'No Payment Intent ID in successful payment event.',
      },
      {
        status: 200,
      },
    );
  }

  try {
    /*
     * Retrieve the Payment Intent server-side. The webhook body is treated
     * as an event notification, while the server-side PayMongo response is
     * used as the payment source of truth before changing the database.
     */
    const paymentIntent =
      await getPaymongoPaymentIntent(
        paymentIntentId,
      );

    const attributes =
      paymentIntent?.data?.attributes ??
      {};

    const intentStatus = String(
      attributes?.status ?? '',
    )
      .trim()
      .toLowerCase();

    if (intentStatus !== 'succeeded') {
      console.warn(
        '[PayMongo Webhook] Successful event received, but Payment Intent is not succeeded yet.',
        {
          eventType,
          paymentIntentId,
          intentStatus,
        },
      );

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
      getWebhookFinalBillId(
        event,
        paymentIntent,
      );

    if (!finalBillId) {
      console.error(
        '[PayMongo Webhook] Payment Intent is missing final_bill_id metadata.',
        {
          eventType,
          paymentIntentId,
        },
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
          eventType,
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

    if (bill.status === 'PAID') {
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

    if (bill.status !== 'OFFICIAL') {
      console.error(
        '[PayMongo Webhook] Successful payment belongs to a Final Cost that is not OFFICIAL.',
        {
          finalBillId,
          paymentIntentId,
          currentStatus: bill.status,
        },
      );

      return NextResponse.json(
        {
          error: true,
          errorMessage:
            `Final Cost is currently ${bill.status}; payment was not applied.`,
        },
        {
          status: 409,
        },
      );
    }

    const expectedAmount = Math.round(
      (Number.parseFloat(
        String(bill.grandTotal ?? 0),
      ) || 0) * 100,
    );

    const remoteAmount = getWebhookAmount(
      event,
      paymentIntent,
    );

    if (
      expectedAmount <= 0 ||
      expectedAmount !== remoteAmount
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

    const remoteCurrency =
      getWebhookCurrency(
        event,
        paymentIntent,
      );

    if (remoteCurrency !== 'PHP') {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Payment currency does not match the Final Cost currency.',
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Only transition OFFICIAL -> PAID. The equality condition makes the
     * operation idempotent and prevents a repeated/late webhook from
     * changing another status into PAID.
     */
    const updated =
      await Database
        .update(FinalBill)
        .set({
          status: 'PAID',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              FinalBill.id,
              finalBillId,
            ),
            eq(
              FinalBill.status,
              'OFFICIAL',
            ),
          ),
        )
        .returning();

    if (!updated.length) {
      const [currentBill] =
        await Database
          .select({
            status: FinalBill.status,
          })
          .from(FinalBill)
          .where(
            eq(
              FinalBill.id,
              finalBillId,
            ),
          )
          .limit(1);

      if (currentBill?.status === 'PAID') {
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

      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Payment succeeded, but the Final Cost could not be transitioned to PAID.',
        },
        {
          status: 409,
        },
      );
    }

    let receiptWarning = null;

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

    /*
     * Notify the customer only after PAID has been persisted.
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
              billId: finalBillId,
            })
            .catch(console.error);
        }
      }
    } catch (notificationError) {
      console.error(
        '[PayMongo Webhook] Payment notification failed:',
        notificationError,
      );
    }

    console.log(
      '[PayMongo Webhook] Final Cost marked PAID:',
      {
        finalBillId,
        paymentIntentId,
        eventType,
      },
    );

    return NextResponse.json(
      {
        received: true,
        processed: true,
        finalBillId,
        paymentIntentId,
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