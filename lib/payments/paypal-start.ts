import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { PaypalCheckoutAttempts } from '@/database/models/payments/paypal-checkout-attempt.model';
import {
  OPEN_PAYPAL_STATUSES,
  PaypalError,
  newPaypalAttempt,
  paypalSandboxEnabled,
  paypalSiteOrigin,
  reconcilePaypalAttempt,
} from '@/lib/payments/paypal-sandbox';

/**
 * The database enforces ONE open attempt per Final Cost using the partial
 * unique index in migration 0054. Always find that open row, not merely the
 * newest historical row: a newer FAILED/EXPIRED row must not hide an older
 * ACTIVE row and turn a normal retry into PostgreSQL 23505.
 */
export async function getOpenPaypalAttempt(finalBillId: string) {
  const [attempt] = await Database.select()
    .from(PaypalCheckoutAttempts)
    .where(and(
      eq(PaypalCheckoutAttempts.finalBillId, finalBillId),
      inArray(PaypalCheckoutAttempts.status, [...OPEN_PAYPAL_STATUSES]),
    ))
    .orderBy(desc(PaypalCheckoutAttempts.createdAt))
    .limit(1);

  return attempt ?? null;
}

type StartedCheckout = {
  checkoutUrl: string;
  status: string;
  reused: boolean;
  sandbox: true;
};

function attemptCheckoutUrl(ticket: string) {
  return `${paypalSiteOrigin()}/paypal/checkout/${ticket}`;
}

function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    const e = current as { code?: unknown; cause?: unknown };
    if (typeof e.code === 'string') return e.code;
    current = e.cause;
  }
  return undefined;
}

/** Safe details suitable for anonymous share-page users. Log the real exception on the server. */
export function paypalStartError(error: unknown) {
  if (error instanceof PaypalError) {
    return {
      status: error.status,
      code: 'PAYPAL_CHECKOUT_STATE',
      errorMessage: error.message,
    };
  }

  switch (postgresErrorCode(error)) {
    case '42P01':
    case '42703':
      return {
        status: 503,
        code: 'PAYPAL_DATABASE_SETUP',
        errorMessage:
          'PayPal checkout storage is not ready. Please contact AutoCare support (PAYPAL_DATABASE_SETUP).',
      };
    case '23505':
      return {
        status: 409,
        code: 'PAYPAL_CHECKOUT_CONFLICT',
        errorMessage:
          'Another PayPal checkout was opened at the same time. Refresh the page and try again.',
      };
    case '23503':
      return {
        status: 409,
        code: 'PAYPAL_BILL_REFERENCE',
        errorMessage:
          'This Final Cost could not be linked to the checkout. Refresh the page and try again.',
      };
    default:
      return {
        status: 503,
        code: 'PAYPAL_CHECKOUT_UNAVAILABLE',
        errorMessage:
          'PayPal checkout is temporarily unavailable. Please try again. If it persists, contact AutoCare support (PAYPAL_CHECKOUT_UNAVAILABLE).',
      };
  }
}

/**
 * Start or resume the canonical checkout, without calling PayPal to create an
 * order yet. The SDK will create the order on /paypal/checkout/[ticket].
 *
 * Stale READY attempts have no remote order and can safely be expired.
 * Unknown order creation is retried using the SAME PayPal idempotency key.
 * Expired ACTIVE attempts are checked directly with PayPal BEFORE retirement.
 * CAS updates + the partial unique index prevent duplicate open attempts even
 * when two browsers click Continue simultaneously.
 */
export async function beginPaypalCheckout(
  finalBillId: string,
  amountCentavos: number,
): Promise<StartedCheckout> {
  if (!paypalSandboxEnabled()) {
    throw new PaypalError(
      'PayPal Sandbox is not configured on the server. Please contact AutoCare support.',
      503,
    );
  }
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos < 100 || amountCentavos > 999999999) {
    throw new PaypalError('This Final Cost amount cannot be paid online.', 422);
  }

  for (let tries = 0; tries < 6; tries++) {
    const attempt = await getOpenPaypalAttempt(finalBillId);

    if (!attempt) {
      try {
        const created = await newPaypalAttempt(finalBillId, amountCentavos);
        return {
          checkoutUrl: created.checkoutUrl,
          status: 'READY',
          reused: false,
          sandbox: true,
        };
      } catch (error) {
        // A simultaneous request may have won the partial unique-index race.
        // Read its canonical row instead of failing with a generic SQL error.
        if (postgresErrorCode(error) === '23505') continue;
        throw error;
      }
    }

    // A READY attempt has NOT been sent to PayPal: it can be safely replaced
    // if the Final Cost amount changed or its one-hour ticket expired.
    if (attempt.status === 'READY' && (
      attempt.amountCentavos !== amountCentavos || attempt.expiresAt.getTime() <= Date.now()
    )) {
      const changed = await Database.update(PaypalCheckoutAttempts)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(and(
          eq(PaypalCheckoutAttempts.id, attempt.id),
          eq(PaypalCheckoutAttempts.status, 'READY'),
        ))
        .returning({ id: PaypalCheckoutAttempts.id });
      if (changed.length) continue;
      continue; // Another request modified the row; reload rather than guessing.
    }

    // An order might already have been captured even if the browser did not
    // receive its response. Always reconcile before reusing or retiring it.
    if (attempt.orderId) {
      const verified = await reconcilePaypalAttempt(attempt.id);
      if (verified.paid) {
        throw new PaypalError('This Final Cost was already paid through PayPal. Refresh to view the receipt.', 409);
      }
    }

    // If order creation failed after the provider request was sent, retry
    // ONLY with this same attempt/PayPal-Request-Id (see ensurePaypalOrder).
    // Never issue a new PayPal order under a different idempotency key.
    if (!attempt.orderId &&
        (attempt.status === 'CREATING' || attempt.status === 'CREATE_UNKNOWN') &&
        attempt.expiresAt.getTime() <= Date.now()) {
      const changed = await Database.update(PaypalCheckoutAttempts)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(and(
          eq(PaypalCheckoutAttempts.id, attempt.id),
          eq(PaypalCheckoutAttempts.status, attempt.status),
        ))
        .returning({ id: PaypalCheckoutAttempts.id });
      if (changed.length) continue;
      continue;
    }
    if (attempt.status === 'CAPTURING' ||
        (attempt.status === 'CREATE_UNKNOWN' && Boolean(attempt.orderId))) {
      throw new PaypalError(
        'A previous PayPal payment needs verification before another checkout can start. Contact AutoCare support.',
        409,
      );
    }
    if (attempt.status === 'CREATING') {
      // An in-flight Vercel request should finish quickly. After 90 seconds,
      // allow idempotent recovery with exactly the same PayPal-Request-Id.
      if (Date.now() - attempt.updatedAt.getTime() < 90_000) {
        throw new PaypalError(
          'Your PayPal checkout is being prepared. Please retry in a moment.',
          409,
        );
      }
      const changed = await Database.update(PaypalCheckoutAttempts)
        .set({ status: 'CREATE_UNKNOWN', updatedAt: new Date() })
        .where(and(
          eq(PaypalCheckoutAttempts.id, attempt.id),
          eq(PaypalCheckoutAttempts.status, 'CREATING'),
        ))
        .returning({ id: PaypalCheckoutAttempts.id });
      if (changed.length) continue;
      continue;
    }

    if (attempt.amountCentavos !== amountCentavos) {
      throw new PaypalError(
        'The Final Cost amount changed while a PayPal order was active. Contact AutoCare to reconcile it.',
        409,
      );
    }

    if (attempt.status === 'ACTIVE' && attempt.expiresAt.getTime() <= Date.now()) {
      // The remote order is NOT captured (verified above). Retiring this row
      // prevents an abandoned checkout from blocking this bill indefinitely.
      // A competing capture must first claim ACTIVE -> CAPTURING and will win
      // or lose atomically against this ACTIVE -> EXPIRED transition.
      const changed = await Database.update(PaypalCheckoutAttempts)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(and(
          eq(PaypalCheckoutAttempts.id, attempt.id),
          eq(PaypalCheckoutAttempts.status, 'ACTIVE'),
          lt(PaypalCheckoutAttempts.expiresAt, new Date()),
        ))
        .returning({ id: PaypalCheckoutAttempts.id });
      if (changed.length) continue;
      continue;
    }

    if (attempt.status !== 'READY' && attempt.status !== 'ACTIVE' &&
        !(attempt.status === 'CREATE_UNKNOWN' && !attempt.orderId)) {
      throw new PaypalError('Checkout status changed. Refresh and try again.', 409);
    }

    return {
      checkoutUrl: attemptCheckoutUrl(attempt.ticket),
      status: attempt.status,
      reused: true,
      sandbox: true,
    };
  }

  throw new PaypalError(
    'The PayPal checkout is changing due to another request. Please refresh and retry.',
    409,
  );
}
