import { NextRequest, NextResponse } from 'next/server';

import { Database } from '@/lib/drizzle';
import { Customers } from '@/database/models/customers/customers.model';

import { eq, sql } from 'drizzle-orm';

import { validateCustomerId } from '@/utils/customers';

function stripPassword(customer: any) {
  const {
    password: _password,
    ...rest
  } = customer;

  return rest;
}

// ------------------------------------------------------------------
// PUT /api/customers/[id]/presence
//
// Updates customer presence from the mobile application.
//
// isOnline = true:
//   Mobile app is active.
//
// isOnline = false:
//   Mobile app is inactive/backgrounded.
// ------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const { id: customerId } = await params;

  const validationError =
    await validateCustomerId(customerId);

  if (validationError) {
    return validationError;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid request',
        errorMessage:
          'Request body must be valid JSON.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fe',
        errorTitle: 'Invalid request',
        errorMessage:
          'Request body must be a JSON object.',
        errorLog: null,
      },
      {
        status: 400,
      }
    );
  }

  const requestBody =
    body as Record<string, unknown>;

  if (
    typeof requestBody.isOnline !== 'boolean'
  ) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'fve',
        errorTitle: 'Invalid presence status',
        errorMessage:
          'The isOnline field must be a boolean.',
        errorLog: null,
      },
      {
        status: 422,
      }
    );
  }

  const isOnline = requestBody.isOnline;

  try {
    const [customer] =
      await Database.select({
        id: Customers.id,
        deactivated:
          Customers.deactivated,
      })
        .from(Customers)
        .where(
          eq(
            Customers.id,
            customerId
          )
        )
        .limit(1);

    if (!customer) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle:
            'Customer not found',
          errorMessage:
            'Customer does not exist.',
          errorLog: null,
        },
        {
          status: 404,
        }
      );
    }

    /*
     * A deactivated customer can never be considered
     * online even if the mobile app sends a heartbeat.
     */
    if (customer.deactivated) {
      await Database.update(Customers)
        .set({
          isOnline: false,
          updatedAt: sql`NOW()`,
        })
        .where(
          eq(
            Customers.id,
            customerId
          )
        );

      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle:
            'Customer deactivated',
          errorMessage:
            'This customer account is deactivated.',
          errorLog: null,
        },
        {
          status: 403,
        }
      );
    }

    const [updatedCustomer] =
      await Database.update(Customers)
        .set({
          isOnline,
          lastSeenAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(
          eq(
            Customers.id,
            customerId
          )
        )
        .returning();

    if (!updatedCustomer) {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle:
            'Presence update failed',
          errorMessage:
            'Customer could not be updated.',
          errorLog: null,
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error: false,
        message: isOnline
          ? 'Customer is now online.'
          : 'Customer is now offline.',
        data:
          stripPassword(
            updatedCustomer
          ),
      },
      {
        status: 200,
      }
    );
  } catch (e) {
    console.error(
      '[PUT /api/customers/[id]/presence]',
      e
    );

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle:
          'Database error',
        errorMessage:
          'Unable to update customer presence.',
        errorLog:
          e instanceof Error
            ? e.message
            : String(e),
      },
      {
        status: 500,
      }
    );
  }
}