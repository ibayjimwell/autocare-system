// app/api/payments/paymongo/webhook/route.ts

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

import {
  isValidUUID,
} from '@/utils/shared';

/* ============================================================================
   NEXT.JS ROUTE CONFIG
============================================================================ */

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

/* ============================================================================
   CONFIG
============================================================================ */

const WEBHOOK_SECRET =
  process.env
    .PAYMONGO_WEBHOOK_SECRET;

const MAX_WEBHOOK_AGE_SECONDS =
  5 * 60;

/* ============================================================================
   BASIC HELPERS
============================================================================ */

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

  return (
    normalized ||
    null
  );
}

function parseSignatureHeader(
  header: string,
) {
  const parts =
    header.split(
      ',',
    );

  const values: Record<
    string,
    string
  > = {};

  for (
    const part of
    parts
  ) {
    const separatorIndex =
      part.indexOf(
        '=',
      );

    if (
      separatorIndex <=
      0
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
          separatorIndex +
            1,
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

/* ============================================================================
   PAYMONGO SIGNATURE VERIFICATION
============================================================================ */

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

  if (!timestamp) {
    return false;
  }

  const timestampNumber =
    Number(
      timestamp,
    );

  if (
    !Number.isFinite(
      timestampNumber,
    )
  ) {
    return false;
  }

  const currentTimestamp =
    Math.floor(
      Date.now() /
        1000,
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
   *   timestamp + "." + raw body
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
      .digest(
        'hex',
      );

  /*
   * Test mode:
   *   te
   *
   * Live mode:
   *   li
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

/* ============================================================================
   EVENT HELPERS
============================================================================ */

function getEventType(
  event: any,
) {
  return normalizeString(
    event
      ?.data
      ?.attributes
      ?.type,
  );
}

function getWebhookPaymentIntentId(
  event: any,
) {
  const resource =
    event
      ?.data
      ?.attributes
      ?.data ??
    {};

  const attributes =
    resource
      ?.attributes ??
    {};

  const candidates:
    unknown[] = [
      attributes
        ?.payment_intent_id,

      attributes
        ?.payment_intent
        ?.id,

      event
        ?.data
        ?.attributes
        ?.payment_intent_id,

      event
        ?.data
        ?.attributes
        ?.payment_intent
        ?.id,
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
      value?.startsWith(
        'pi_',
      )
    ) {
      return value;
    }
  }

  return null;
}

function getIntentAttributes(
  paymentIntent: any,
) {
  return (
    paymentIntent
      ?.data
      ?.attributes ??
    paymentIntent
      ?.attributes ??
    {}
  );
}

function getIntentMetadata(
  paymentIntent: any,
) {
  const metadata =
    getIntentAttributes(
      paymentIntent,
    )
      ?.metadata;

  return (
    metadata &&
    typeof metadata ===
      'object'
  )
    ? metadata
    : {};
}

function getIntentPaymentMethod(
  paymentIntent: any,
) {
  const allowed =
    getIntentAttributes(
      paymentIntent,
    )
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

function getWebhookFinalBillId(
  event: any,
  paymentIntent: any,
) {
  const intentMetadata =
    getIntentMetadata(
      paymentIntent,
    );

  const paymentMetadata =
    event
      ?.data
      ?.attributes
      ?.data
      ?.attributes
      ?.metadata ??
    {};

  const eventMetadata =
    event
      ?.data
      ?.attributes
      ?.metadata ??
    {};

  const candidates:
    unknown[] = [
      intentMetadata
        ?.final_bill_id,

      paymentMetadata
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
  const intentAmount =
    getIntentAttributes(
      paymentIntent,
    )
      ?.amount;

  const paymentAmount =
    event
      ?.data
      ?.attributes
      ?.data
      ?.attributes
      ?.amount;

  return Number(
    intentAmount ??
      paymentAmount ??
      0,
  );
}

function getWebhookCurrency(
  event: any,
  paymentIntent: any,
) {
  const currency =
    getIntentAttributes(
      paymentIntent,
    )
      ?.currency ??
    event
      ?.data
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

/* ============================================================================
   HEALTH CHECK
============================================================================ */

export async function GET() {
  console.log(
    '[PayMongo Webhook] GET health check received.',
  );

  return NextResponse.json(
    {
      ok:
        true,

      service:
        'AutoCare PayMongo Webhook',

      route:
        '/api/payments/paymongo/webhook',

      message:
        'PayMongo webhook endpoint is reachable.',
    },
    {
      status:
        200,

      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
      },
    },
  );
}

/* ============================================================================
   POST WEBHOOK
============================================================================ */

export async function POST(
  req: NextRequest,
) {
  console.log(
    '[PayMongo Webhook] POST request received.',
    {
      url:
        req.url,

      receivedAt:
        new Date()
          .toISOString(),

      userAgent:
        req.headers.get(
          'user-agent',
        ),
    },
  );

  /* --------------------------------------------------------------------------
     RAW BODY
  -------------------------------------------------------------------------- */

  const rawBody =
    await req.text();

  if (!rawBody) {
    console.error(
      '[PayMongo Webhook] Empty request body.',
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Empty webhook body.',
      },
      {
        status:
          400,
      },
    );
  }

  /* --------------------------------------------------------------------------
     SIGNATURE HEADER
  -------------------------------------------------------------------------- */

  const signature =
    req.headers.get(
      'paymongo-signature',
    ) ??
    req.headers.get(
      'Paymongo-Signature',
    );

  if (!signature) {
    console.error(
      '[PayMongo Webhook] Missing PayMongo signature header.',
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Missing PayMongo webhook signature.',
      },
      {
        status:
          401,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY SIGNATURE
  -------------------------------------------------------------------------- */

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
        error:
          true,

        errorMessage:
          'Webhook verification is not configured.',
      },
      {
        status:
          500,
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
        error:
          true,

        errorMessage:
          'Invalid PayMongo webhook signature.',
      },
      {
        status:
          401,
      },
    );
  }

  console.log(
    '[PayMongo Webhook] Signature verified.',
  );

  /* --------------------------------------------------------------------------
     PARSE EVENT
  -------------------------------------------------------------------------- */

  let event:
    any;

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
        error:
          true,

        errorMessage:
          'Invalid webhook JSON.',
      },
      {
        status:
          400,
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
        event
          ?.data
          ?.attributes
          ?.livemode,
    },
  );

  /* --------------------------------------------------------------------------
     QRPH EXPIRED
  -------------------------------------------------------------------------- */

  if (
    eventType ===
    'qrph.expired'
  ) {
    console.warn(
      '[PayMongo Webhook] QRPh payment expired.',
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
        status:
          200,
      },
    );
  }

  /* --------------------------------------------------------------------------
     PAYMENT FAILED
  -------------------------------------------------------------------------- */

  if (
    eventType ===
    'payment.failed'
  ) {
    console.warn(
      '[PayMongo Webhook] Payment failed.',
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
        status:
          200,
      },
    );
  }

  /* --------------------------------------------------------------------------
     ONLY PAYMENT.PAID FINALIZES THE BILL
  -------------------------------------------------------------------------- */

  if (
    eventType !==
    'payment.paid'
  ) {
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
        status:
          200,
      },
    );
  }

  /* --------------------------------------------------------------------------
     FIND PAYMENT INTENT ID
  -------------------------------------------------------------------------- */

  const paymentIntentId =
    getWebhookPaymentIntentId(
      event,
    );

  if (
    !paymentIntentId
  ) {
    console.error(
      '[PayMongo Webhook] payment.paid did not contain a Payment Intent ID.',
    );

    return NextResponse.json(
      {
        received:
          true,

        ignored:
          true,

        reason:
          'No Payment Intent ID in payment.paid event.',
      },
      {
        status:
          200,
      },
    );
  }

  console.log(
    '[PayMongo Webhook] Payment Intent identified:',
    {
      paymentIntentId,
    },
  );

  /* --------------------------------------------------------------------------
     RETRIEVE PAYMENT INTENT FROM PAYMONGO

     We do not trust webhook values alone for Final Bill settlement.
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
      '[PayMongo Webhook] Unable to retrieve Payment Intent:',
      error,
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Unable to verify Payment Intent with PayMongo.',
      },
      {
        /*
         * Return a failure so PayMongo can retry the webhook.
         */
        status:
          500,
      },
    );
  }

  const intentAttributes =
    getIntentAttributes(
      paymentIntent,
    );

  const intentStatus =
    String(
      intentAttributes
        ?.status ??
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
          'payment.paid was received, but Payment Intent is not succeeded.',
      },
      {
        status:
          200,
      },
    );
  }

  /* --------------------------------------------------------------------------
     FINAL BILL ID
  -------------------------------------------------------------------------- */

  const finalBillId =
    getWebhookFinalBillId(
      event,
      paymentIntent,
    );

  if (
    !finalBillId ||
    !isValidUUID(
      finalBillId,
    )
  ) {
    console.error(
      '[PayMongo Webhook] Invalid or missing final_bill_id metadata.',
      {
        finalBillId,
        paymentIntentId,
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
        status:
          400,
      },
    );
  }

  /* --------------------------------------------------------------------------
     LOAD FINAL BILL
  -------------------------------------------------------------------------- */

  const [bill] =
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

  if (!bill) {
    console.error(
      '[PayMongo Webhook] Final Cost not found.',
      {
        finalBillId,
        paymentIntentId,
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
        status:
          404,
      },
    );
  }

  /*
   * PAID is accepted because another verify-payment request may have won
   * the race.
   *
   * generatePaymentReceipt() will return the existing receipt.
   */
  if (
    bill.status !==
      'OFFICIAL' &&
    bill.status !==
      'PAID'
  ) {
    console.error(
      '[PayMongo Webhook] Final Cost is not payable.',
      {
        finalBillId,
        paymentIntentId,
        status:
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
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY PAYMENT INTENT BELONGS TO FINAL BILL
  -------------------------------------------------------------------------- */

  const metadata =
    getIntentMetadata(
      paymentIntent,
    );

  if (
    metadata
      ?.final_bill_id !==
    finalBillId
  ) {
    console.error(
      '[PayMongo Webhook] Payment Intent Final Bill metadata mismatch.',
      {
        finalBillId,
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
          'Payment Intent does not belong to this Final Cost.',
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
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY CURRENCY
  -------------------------------------------------------------------------- */

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
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     VERIFY QRPH
  -------------------------------------------------------------------------- */

  const paymentMethod =
    getIntentPaymentMethod(
      paymentIntent,
    );

  const metadataPaymentMethod =
    typeof metadata
      ?.payment_method ===
      'string'
      ? metadata
          .payment_method
          .trim()
          .toLowerCase()
      : null;

  if (
    metadataPaymentMethod &&
    metadataPaymentMethod !==
      'qrph'
  ) {
    console.error(
      '[PayMongo Webhook] Metadata payment method is not QRPh.',
      {
        finalBillId,
        paymentIntentId,
        metadataPaymentMethod,
      },
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment method does not match AutoCare QRPh payment session.',
      },
      {
        status:
          409,
      },
    );
  }

  if (
    paymentMethod &&
    paymentMethod !==
      'qrph'
  ) {
    console.error(
      '[PayMongo Webhook] Payment Intent is not QRPh.',
      {
        finalBillId,
        paymentIntentId,
        paymentMethod,
      },
    );

    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          'Payment Intent is not a QRPh payment.',
      },
      {
        status:
          409,
      },
    );
  }

  /* --------------------------------------------------------------------------
     FINALIZE PAYMENT + GENERATE RECEIPT

     This is now ONE shared atomic operation.

     DO NOT manually update FinalBill to PAID before this.
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
        finalBillId,
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
      '[PayMongo Webhook] Payment finalization/receipt generation failed:',
      error,
    );

    /*
     * Return 500 so PayMongo can retry.
     *
     * Because receipt + PAID transition are transactional, a failed receipt
     * insertion will not leave a newly processed bill in a half-completed
     * state.
     */
    return NextResponse.json(
      {
        error:
          true,

        errorMessage:
          error instanceof
          Error
            ? error.message
            : 'Unable to finalize payment and generate receipt.',
      },
      {
        status:
          500,
      },
    );
  }

  console.log(
    '[PayMongo Webhook] Payment finalized.',
    {
      finalBillId,

      paymentIntentId,

      referenceNumber:
        receiptResult.referenceNumber,

      receiptCreated:
        receiptResult.created,

      alreadyProcessed:
        receiptResult.alreadyProcessed,
    },
  );

  /* --------------------------------------------------------------------------
     MOBILE CUSTOMER NOTIFICATION

     Only send when THIS invocation actually created the receipt/payment.

     This prevents:
       webhook notification
       +
       polling notification
       +
       retry notification
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
  }

  /* --------------------------------------------------------------------------
     SUCCESS
  -------------------------------------------------------------------------- */

  console.log(
    '[PayMongo Webhook] ✅ PAYMENT WEBHOOK COMPLETED.',
    {
      finalBillId,

      paymentIntentId,

      eventType,

      referenceNumber:
        receiptResult.referenceNumber,

      receiptCreated:
        receiptResult.created,

      alreadyProcessed:
        receiptResult.alreadyProcessed,
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

      paymentMethod:
        'qrph',

      status:
        'PAID',

      referenceNumber:
        receiptResult.referenceNumber,

      receiptCreated:
        receiptResult.created,

      alreadyProcessed:
        receiptResult.alreadyProcessed,
    },
    {
      status:
        200,
    },
  );
}