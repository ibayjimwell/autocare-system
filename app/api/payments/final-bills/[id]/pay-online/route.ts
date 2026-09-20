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
  createPaymongoPaymentLink,
} from '@/lib/paymongo';

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

    /*
     * Only an OFFICIAL bill should be opened for customer payment.
     */
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

    const description =
      `Payment for invoice ${bill.id.slice(
        0,
        8,
      )}`;

    const paymentLink =
      await createPaymongoPaymentLink({
        amount:
          amountInCentavos,

        description,

        remarks:
          `Final Cost ${bill.id}`,
      });

    return NextResponse.json(
      {
        error: false,

        message:
          'Payment link created.',

        data: {
          checkoutUrl:
            paymentLink.checkoutUrl,

          paymongoLinkId:
            paymentLink.id,

          referenceNumber:
            paymentLink.referenceNumber,
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
          'Payment creation failed',

        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unable to create PayMongo link.',
      },
      {
        status: 500,
      },
    );
  }
}