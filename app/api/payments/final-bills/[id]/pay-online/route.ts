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
  eq,
} from 'drizzle-orm';

import {
  isValidUUID,
} from '@/utils/shared';

import {
  createPaymongoPaymentIntent,
} from '@/lib/paymongo';

const ALLOWED_PAYMENT_METHODS = new Set([
  'gcash',
  'paymaya',
  'card',
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
          'Unsupported payment method. Choose GCash, Maya, or card.',
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
