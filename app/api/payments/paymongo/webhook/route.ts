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

/*
 * Explicitly use the Node.js runtime because this route uses
 * node:crypto and server-side database access.
 */
export const runtime = 'nodejs';

/*
 * The webhook must execute dynamically for every incoming event.
 */
export const dynamic = 'force-dynamic';

const WEBHOOK_SECRET =
  process.env.PAYMONGO_WEBHOOK_SECRET;

const MAX_WEBHOOK_AGE_SECONDS =
  5 * 60;

/* ================================================================
   BASIC HELPERS
================================================================ */

function normalizeString(
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

  return normalized || null;
}

function parseSignatureHeader(
  header: string,
) {
  const parts =
    header.split(',');

  const values: Record<
    string,
    string
  > = {};

  for (
    const part of parts
  ) {
    const separatorIndex =
      part.indexOf('=');

    if (
      separatorIndex <= 0
    ) {
      continue;
    }

    const key =
      part
        .slice(
          0,
          separatorIndex,
        )
        .trim();

    const value =
      part
        .slice(
          separatorIndex + 1,
        )
        .trim();

    values[key] =
      value;
  }

  return {
    timestamp:
      values.t,

    testSignature:
      values.te,

    liveSignature:
      values.li,
  };
}

function safeEqual(
  expected: string,
  actual: string,
) {
  const expectedBuffer =
    Buffer.from(
      expected,
      'utf8',
    );

  const actualBuffer =
    Buffer.from(
      actual,
      'utf8',
    );

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

/* ================================================================
   PAYMONGO SIGNATURE VERIFICATION
================================================================ */

function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string,
) {
  if (
    !WEBHOOK_SECRET
  ) {
    throw new Error(
      'PAYMONGO_WEBHOOK_SECRET is not configured.',
    );
  }

  const {
    timestamp,
    testSignature,
    liveSignature,
  } =
    parseSignatureHeader(
      signatureHeader,
    );

  if (
    !timestamp
  ) {
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

  const currentTimestamp =
    Math.floor(
      Date.now() / 1000,
    );

  const age =
    Math.abs(
      currentTimestamp -
        timestampNumber,
    );

  if (
    age >
    MAX_WEBHOOK_AGE_SECONDS
  ) {
    console.error(
      '[PayMongo Webhook] Webhook timestamp is too old.',
      {
        age,
        maximumAge:
          MAX_WEBHOOK_AGE_SECONDS,
      },
    );

    return false;
  }

  /*
   * PayMongo signs:
   *
   * timestamp + "." + raw request body
   */
  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature =
    createHmac(
      'sha256',
      WEBHOOK_SECRET,
    )
      .update(
        signedPayload,
      )
      .digest('hex');

  /*
   * Test mode uses `te`.
   * Live mode uses `li`.
   *
   * We accept whichever valid signature PayMongo included.
   * The endpoint itself should still be registered in the correct
   * PayMongo mode.
   */
  if (
    testSignature &&
    safeEqual(
      expectedSignature,
      testSignature,
    )
  ) {
    return true;
  }

  if (
    liveSignature &&
    safeEqual(
      expectedSignature,
      liveSignature,
    )
  ) {
    return true;
  }

  return false;
}

/* ================================================================
   EVENT HELPERS
================================================================ */

function getEventType(
  event: any,
) {
  return normalizeString(
    event?.data?.attributes
      ?.type,
  );
}

function getWebhookPaymentIntentId(
  event: any,
  eventType: string | null,
) {
  const resource =
    event?.data?.attributes
      ?.data ?? {};

  const resourceAttributes =
    resource?.attributes ??
    {};

  const candidates: unknown[] = [
    resourceAttributes
      ?.payment_intent_id,

    resourceAttributes
      ?.payment_intent?.id,

    event?.data?.attributes
      ?.payment_intent_id,

    event?.data?.attributes
      ?.payment_intent?.id,
  ];

  /*
   * payment_intent.succeeded directly identifies the Payment Intent
   * resource as data.id.
   */
  if (
    eventType ===
    'payment_intent.succeeded'
  ) {
    candidates.unshift(
      resource?.id,
    );

    candidates.unshift(
      event?.data?.id,
    );
  }

  for (
    const candidate of
      candidates
  ) {
    const value =
      normalizeString(
        candidate,
      );

    if (
      value?.startsWith(
        'pi_',
      )
    ) {
      return value;
    }
  }

  /*
   * Extra fallback for a resource that itself is a Payment Intent.
   */
  if (
    resource?.type ===
      'payment_intent' &&
    typeof resource?.id ===
      'string' &&
    resource.id.startsWith(
      'pi_',
    )
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
    paymentIntent?.data
      ?.attributes
      ?.metadata ??
    paymentIntent
      ?.attributes
      ?.metadata ??
    {};

  const paymentResourceMetadata =
    event?.data
      ?.attributes
      ?.data
      ?.attributes
      ?.metadata ??
    {};

  const eventMetadata =
    event?.data
      ?.attributes
      ?.metadata ??
    {};

  const candidates: unknown[] = [
    paymentIntentMetadata
      ?.final_bill_id,

    paymentResourceMetadata
      ?.final_bill_id,

    eventMetadata
      ?.final_bill_id,
  ];

  for (
    const candidate of
      candidates
  ) {
    const value =
      normalizeString(
        candidate,
      );

    if (
      value
    ) {
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
    paymentIntent?.data
      ?.attributes
      ?.amount ??
    paymentIntent
      ?.attributes
      ?.amount;

  const webhookPaymentAmount =
    event?.data
      ?.attributes
      ?.data
      ?.attributes
      ?.amount;

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
    paymentIntent?.data
      ?.attributes
      ?.currency ??
    paymentIntent
      ?.attributes
      ?.currency ??
    event?.data
      ?.attributes
      ?.data
      ?.attributes
      ?.currency ??
    'PHP';

  return String(
    currency,
  )
    .trim()
    .toUpperCase();
}

/* ================================================================
   HEALTH CHECK

   This GET endpoint is only for verifying that the exact deployed
   Vercel route exists.

   PayMongo itself sends POST requests.
================================================================ */

export async function GET() {
  console.log(
    '[PayMongo Webhook] GET health check received.',
  );

  return NextResponse.json(
    {
      ok: true,

      service:
        'AutoCare PayMongo Webhook',

      route:
        '/api/payments/paymongo/webhook',

      message:
        'PayMongo webhook endpoint is reachable.',
    },
    {
      status: 200,

      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
      },
    },
  );
}

/* ================================================================
   PAYMONGO WEBHOOK
================================================================ */

export async function POST(
  req: NextRequest,
) {
  /*
   * IMPORTANT:
   * This log happens before signature validation, JSON parsing,
   * database access, or PayMongo API calls.
   *
   * Therefore, if this does not appear in Vercel logs, the request
   * never reached this route.
   */
  console.log(
    '[PayMongo Webhook] POST request received.',
    {
      url:
        req.url,

      receivedAt:
        new Date().toISOString(),

      userAgent:
        req.headers.get(
          'user-agent',
        ),
    },
  );

  const rawBody =
    await req.text();

  if (
    !rawBody
  ) {
    console.error(
      '[PayMongo Webhook] Empty request body.',
    );

    return NextResponse.json(
      {
        error: true,

        errorMessage:
          'Empty webhook body.',
      },
      {
        status: 400,
      },
    );
  }

  const signature =
    req.headers.get(
      'paymongo-signature',
    ) ??
    req.headers.get(
      'Paymongo-Signature',
    );

  if (
    !signature
  ) {
    console.error(
      '[PayMongo Webhook] Missing PayMongo signature header.',
    );

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

  /* ============================================================
     VERIFY SIGNATURE
  ============================================================ */

  let signatureValid =
    false;

  try {
    signatureValid =
      verifyPayMongoSignature(
        rawBody,
        signature,
      );
  } catch (
    error
  ) {
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

  if (
    !signatureValid
  ) {
    console.error(
      '[PayMongo Webhook] Invalid webhook signature.',
    );

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

  console.log(
    '[PayMongo Webhook] Signature verified.',
  );

  /* ============================================================
     PARSE EVENT
  ============================================================ */

  let event: any;

  try {
    event =
      JSON.parse(
        rawBody,
      );
  } catch (
    error
  ) {
    console.error(
      '[PayMongo Webhook] Invalid JSON:',
      error,
    );

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
    getEventType(
      event,
    );

  console.log(
    '[PayMongo Webhook] Event received:',
    {
      eventType,

      livemode:
        event?.data
          ?.attributes
          ?.livemode,
    },
  );

  /* ============================================================
     SUPPORTED PAYMENT EVENTS
  ============================================================ */

  const supportedPaymentEvents =
    new Set([
      'payment.paid',
    ]);

  if (
    !eventType ||
    !supportedPaymentEvents.has(
      eventType,
    )
  ) {
    /*
     * We acknowledge failed and unrelated events so PayMongo does
     * not retry an event that AutoCare intentionally does not process.
     */
    if (
      eventType ===
      'qrph.expired'
    ) {
      console.warn(
        '[PayMongo Webhook] QRPh payment expired event received.',
      );

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

    if (
      eventType ===
      'payment.failed'
    ) {
      console.warn(
        '[PayMongo Webhook] Payment failed event received.',
      );

      return NextResponse.json(
        {
          received:
            true,

          processed:
            false,

          event:
            eventType,
        },
        {
          status: 200,
        },
      );
    }

    console.log(
      '[PayMongo Webhook] Ignoring unsupported event:',
      eventType,
    );

    return NextResponse.json(
      {
        received:
          true,

        ignored:
          true,

        event:
          eventType,
      },
      {
        status: 200,
      },
    );
  }

  /* ============================================================
     FIND PAYMENT INTENT
  ============================================================ */

  const paymentIntentId =
    getWebhookPaymentIntentId(
      event,
      eventType,
    );

  if (
    !paymentIntentId
  ) {
    console.error(
      '[PayMongo Webhook] Successful payment event did not contain a Payment Intent ID.',
      {
        eventType,
      },
    );

    return NextResponse.json(
      {
        received:
          true,

        ignored:
          true,

        reason:
          'No Payment Intent ID in successful payment event.',
      },
      {
        status: 200,
      },
    );
  }

  console.log(
    '[PayMongo Webhook] Payment Intent identified:',
    {
      paymentIntentId,
      eventType,
    },
  );

  /* ============================================================
     SERVER-SIDE PAYMONGO VERIFICATION
  ============================================================ */

  try {
    const paymentIntent =
      await getPaymongoPaymentIntent(
        paymentIntentId,
      );

    const attributes =
      paymentIntent?.data
        ?.attributes ??
      {};

    const intentStatus =
      String(
        attributes?.status ??
          '',
      )
        .trim()
        .toLowerCase();

    console.log(
      '[PayMongo Webhook] Payment Intent status:',
      {
        paymentIntentId,

        intentStatus,
      },
    );

    if (
      intentStatus !==
      'succeeded'
    ) {
      console.warn(
        '[PayMongo Webhook] Payment Intent is not succeeded yet.',
        {
          paymentIntentId,

          intentStatus,
        },
      );

      return NextResponse.json(
        {
          received:
            true,

          processed:
            false,

          message:
            'Payment event received, but Payment Intent is not succeeded.',
        },
        {
          status: 200,
        },
      );
    }

    /* ============================================================
       FIND FINAL BILL
    ============================================================ */

    const finalBillId =
      getWebhookFinalBillId(
        event,
        paymentIntent,
      );

    if (
      !finalBillId
    ) {
      console.error(
        '[PayMongo Webhook] Payment Intent has no final_bill_id metadata.',
        {
          paymentIntentId,

          eventType,
        },
      );

      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            'Payment Intent metadata is incomplete.',
        },
        {
          status: 400,
        },
      );
    }

    console.log(
      '[PayMongo Webhook] Final Cost identified:',
      {
        finalBillId,

        paymentIntentId,
      },
    );

    /* ============================================================
       LOAD FINAL BILL
    ============================================================ */

    const [
      bill,
    ] =
      await Database
        .select()
        .from(
          FinalBill,
        )
        .where(
          eq(
            FinalBill.id,
            finalBillId,
          ),
        )
        .limit(1);

    if (
      !bill
    ) {
      console.error(
        '[PayMongo Webhook] Final Cost not found.',
        {
          finalBillId,

          paymentIntentId,

          eventType,
        },
      );

      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            'Final Cost not found.',
        },
        {
          status: 404,
        },
      );
    }

    /* ============================================================
       IDEMPOTENCY
    ============================================================ */

    if (
      bill.status ===
      'PAID'
    ) {
      console.log(
        '[PayMongo Webhook] Final Cost is already PAID.',
        {
          finalBillId,

          paymentIntentId,
        },
      );

      return NextResponse.json(
        {
          received:
            true,

          processed:
            true,

          alreadyPaid:
            true,
        },
        {
          status: 200,
        },
      );
    }

    /* ============================================================
       ONLY OFFICIAL MAY BECOME PAID
    ============================================================ */

    if (
      bill.status !==
      'OFFICIAL'
    ) {
      console.error(
        '[PayMongo Webhook] Final Cost is not OFFICIAL.',
        {
          finalBillId,

          paymentIntentId,

          currentStatus:
            bill.status,
        },
      );

      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            `Final Cost is currently ${bill.status}; payment was not applied.`,
        },
        {
          status: 409,
        },
      );
    }

    /* ============================================================
       VERIFY AMOUNT
    ============================================================ */

    const expectedAmount =
      Math.round(
        (Number.parseFloat(
          String(
            bill.grandTotal ??
              0,
          ),
        ) || 0) *
          100,
      );

    const remoteAmount =
      getWebhookAmount(
        event,
        paymentIntent,
      );

    console.log(
      '[PayMongo Webhook] Payment amount verification:',
      {
        finalBillId,

        paymentIntentId,

        expectedAmount,

        remoteAmount,
      },
    );

    if (
      expectedAmount <=
        0 ||
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
          error:
            true,

          errorMessage:
            'Payment amount does not match Final Cost.',
        },
        {
          status: 409,
        },
      );
    }

    /* ============================================================
       VERIFY CURRENCY
    ============================================================ */

    const remoteCurrency =
      getWebhookCurrency(
        event,
        paymentIntent,
      );

    if (
      remoteCurrency !==
      'PHP'
    ) {
      console.error(
        '[PayMongo Webhook] Currency mismatch.',
        {
          finalBillId,

          paymentIntentId,

          remoteCurrency,
        },
      );

      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            'Payment currency does not match the Final Cost currency.',
        },
        {
          status: 409,
        },
      );
    }

    /* ============================================================
       OFFICIAL -> PAID
    ============================================================ */

    /*
     * The WHERE clause is intentionally:
     *
     *   id = finalBillId
     *   AND status = OFFICIAL
     *
     * This means the webhook cannot accidentally convert a different
     * state into PAID.
     */
    const updated =
      await Database
        .update(
          FinalBill,
        )
        .set({
          status:
            'PAID',

          updatedAt:
            new Date(),
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

    if (
      !updated.length
    ) {
      const [
        currentBill,
      ] =
        await Database
          .select({
            status:
              FinalBill.status,
          })
          .from(
            FinalBill,
          )
          .where(
            eq(
              FinalBill.id,
              finalBillId,
            ),
          )
          .limit(1);

      if (
        currentBill?.status ===
        'PAID'
      ) {
        return NextResponse.json(
          {
            received:
              true,

            processed:
              true,

            alreadyPaid:
              true,
          },
          {
            status: 200,
          },
        );
      }

      console.error(
        '[PayMongo Webhook] Payment succeeded but Final Cost transition failed.',
        {
          finalBillId,

          paymentIntentId,

          currentStatus:
            currentBill?.status ??
            null,
        },
      );

      return NextResponse.json(
        {
          error:
            true,

          errorMessage:
            'Payment succeeded, but the Final Cost could not be transitioned to PAID.',
        },
        {
          status: 409,
        },
      );
    }

    const paidBill =
      updated[0];

    console.log(
      '[PayMongo Webhook] ✅ FINAL COST MARKED PAID.',
      {
        finalBillId,

        paymentIntentId,

        previousStatus:
          'OFFICIAL',

        newStatus:
          paidBill.status,

        updatedAt:
          paidBill.updatedAt,
      },
    );

    /* ============================================================
       RECEIPT
    ============================================================ */

    let receiptWarning =
      null;

    try {
      await generatePaymentReceipt(
        finalBillId,
      );

      console.log(
        '[PayMongo Webhook] Receipt generated.',
        {
          finalBillId,
        },
      );
    } catch (
      error
    ) {
      console.error(
        '[PayMongo Webhook] Receipt generation failed:',
        error,
      );

      receiptWarning =
        error instanceof Error
          ? error.message
          : 'Payment succeeded but receipt generation failed.';
    }

    /* ============================================================
       MOBILE CUSTOMER NOTIFICATION
    ============================================================ */

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

              billId:
                finalBillId,
            })
            .catch(
              error => {
                console.error(
                  '[PayMongo Webhook] Mobile payment trigger failed:',
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
        '[PayMongo Webhook] Payment notification lookup failed:',
        notificationError,
      );
    }

    console.log(
      '[PayMongo Webhook] ✅ PAYMENT WEBHOOK COMPLETED.',
      {
        finalBillId,

        paymentIntentId,

        eventType,

        receiptWarning,
      },
    );

    return NextResponse.json(
      {
        received:
          true,

        processed:
          true,

        finalBillId,

        paymentIntentId,

        status:
          'PAID',

        receiptWarning,
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      '[PayMongo Webhook] Processing failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Unable to process PayMongo payment event.',
      },
      {
        status: 500,
      },
    );
  }
}