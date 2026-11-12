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
import { QrPhPaymentAttempts } from '@/database/models/payments/qrph-payment-attempt.model';
import { HostedCheckoutAttempts } from '@/database/models/payments/hosted-checkout-attempt.model';
import { paymongoIsLive } from '@/lib/payments/hosted-checkout';
import { Appointments } from '@/database/models/appointments/appointments.model';
import { canAccessQrPhBill } from '@/lib/payments/qrph-access';

import {
  eq, and, inArray,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  createPaymongoPaymentIntent,
  getPaymongoPaymentIntent,
} from '@/lib/paymongo';

const ALLOWED_PAYMENT_METHODS = new Set([
  'qrph',
]);

function normalizePaymentMethod(
  value: unknown,
) {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  return ALLOWED_PAYMENT_METHODS.has(
    normalized,
  )
    ? normalized
    : null;
}

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
  const { id } =
    await params;

  if (!isValidUUID(id)) {
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

  const paymentMethod =
    normalizePaymentMethod(
      (body as Record<string, unknown> | null)
        ?.paymentMethod,
    );

  if (!paymentMethod) {
    return NextResponse.json(
      {
        error: true,
        errorMessage:
          'Unsupported payment method. QRPh is currently the only enabled online payment method.',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const [bill] =
      await Database
        .select()
        .from(FinalBill)
        .where(
          eq(
            FinalBill.id,
            id,
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

    const [appointment] = await Database.select({ customerId: Appointments.customerId })
      .from(Appointments).where(eq(Appointments.id, bill.appointmentId)).limit(1);
    if (!appointment || !(await canAccessQrPhBill(req, appointment.customerId))) {
      return NextResponse.json({ error: true, errorMessage: 'Not authorized to pay this Final Cost.' }, { status: 403 });
    }

    if (
      bill.status ===
      'PAID'
    ) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Bill already paid',
        },
        {
          status: 400,
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

    const amount =
      Number.parseFloat(
        String(
          bill.grandTotal ??
            0,
        ),
      ) || 0;

    if (amount <= 0) {
      return NextResponse.json(
        {
          error: true,
          errorMessage:
            'Final Cost has an invalid payment amount.',
        },
        {
          status: 422,
        },
      );
    }

    const amountInCentavos =
      Math.round(
        amount * 100,
      );

    // The native QR Ph flow creates Payment Methods with the public key.
    // Test and live public/secret keys must always be from the same mode.
    const publicKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY?.trim() ?? '';
    if (!publicKey.startsWith(paymongoIsLive() ? 'pk_live_' : 'pk_test_')) {
      return NextResponse.json({ error: true, errorMessage: 'QR Ph payment keys are not correctly paired.' }, { status: 503 });
    }


    // The hosted GCash/Maya/card checkout and direct QR Ph must not both
    // remain payable for the same Final Cost.
    const [hostedAttempt] = await Database.select({ id: HostedCheckoutAttempts.id })
      .from(HostedCheckoutAttempts).where(and(
        eq(HostedCheckoutAttempts.finalBillId, id),
        inArray(HostedCheckoutAttempts.status, ['CREATING', 'CREATE_UNKNOWN', 'ACTIVE', 'PROCESSING']),
      )).limit(1);
    if (hostedAttempt) {
      return NextResponse.json({ error: true, errorMessage: 'An online checkout is already open for this Final Cost. Finish or cancel it before generating QR Ph.' }, { status: 409 });
    }

    // Only one payable QRPh intent at a time. A second code could result in
    // double charging even though receipt creation is idempotent.
    const [activeAttempt] = await Database.select()
      .from(QrPhPaymentAttempts)
      .where(and(
        eq(QrPhPaymentAttempts.finalBillId, id),
        inArray(QrPhPaymentAttempts.status, ['INITIATED', 'PENDING', 'PROCESSING']),
      )).limit(1);

    if (activeAttempt) {
      // Reuse the same active PayMongo QR for cashier Web and customer Mobile.
      // The provider remains authoritative; do not start another payable intent.
      const remote = await getPaymongoPaymentIntent(activeAttempt.paymentIntentId);
      const attrs = remote?.data?.attributes ?? {};
      const nextAction = attrs?.next_action ?? {};
      if (attrs?.metadata?.final_bill_id !== id || Number(attrs?.amount) !== amountInCentavos ||
          String(attrs?.currency).toUpperCase() !== 'PHP' ||
          !Array.isArray(attrs?.payment_method_allowed) || !attrs.payment_method_allowed.includes('qrph')) {
        return NextResponse.json({ error: true, errorMessage: 'The existing PayMongo payment did not match this bill.' }, { status: 409 });
      }
      const remoteStatus = String(attrs?.status ?? '').toLowerCase();
      const isTimedOut = activeAttempt.expiresAt.getTime() <= Date.now();
      if (remoteStatus === 'succeeded') {
        return NextResponse.json({ error: true, errorMessage: 'PayMongo has accepted a payment. Check status while the receipt is being finalized.' }, { status: 409 });
      }
      if (remoteStatus === 'cancelled' || (isTimedOut && remoteStatus !== 'processing')) {
        await Database.update(QrPhPaymentAttempts).set({ status: 'EXPIRED', updatedAt: new Date() })
          .where(eq(QrPhPaymentAttempts.id, activeAttempt.id));
      } else {
        const image = nextAction?.code?.image_url ?? null;
        return NextResponse.json({ error: false, message: 'Existing QRPh payment resumed.', data: {
          paymentIntentId: activeAttempt.paymentIntentId,
          clientKey: attrs.client_key ?? null,
          qrImageUrl: image,
          qrTestUrl: nextAction?.code?.test_url ?? nextAction?.test_url ?? null,
          expiresAt: activeAttempt.expiresAt.toISOString(),
          existing: true, amount: attrs.amount, paymentMethod: 'qrph',
        } });
      }
    }

    const paymentIntent =
      await createPaymongoPaymentIntent({
        amount:
          amountInCentavos,

        paymentMethod,

        description:
          'AutoCare Final Cost Payment',

        metadata: {
          final_bill_id:
            bill.id,
          appointment_id:
            bill.appointmentId,
          payment_method:
            paymentMethod,
        },
      });

    // Persist each attempt so the cashier and customer see the same outcome.
    // Never accept the payment amount from the browser.
    await Database.insert(QrPhPaymentAttempts).values({
      finalBillId: bill.id,
      paymentIntentId: paymentIntent.id,
      amountCentavos: amountInCentavos,
      status: 'INITIATED',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return NextResponse.json(
      {
        error: false,
        message:
          'Payment Intent created.',
        data: {
          paymentIntentId:
            paymentIntent.id,
          clientKey:
            paymentIntent.clientKey,
          status:
            paymentIntent.status,
          amount:
            paymentIntent.amount,
          paymentMethod,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      '[POST /api/payments/final-bills/[id]/pay-online] Error:',
      error,
    );

    return NextResponse.json(
      {
        error: true,
        errorTitle:
          'Payment setup failed',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unable to create PayMongo Payment Intent.',
      },
      {
        status: 500,
      },
    );
  }
}
