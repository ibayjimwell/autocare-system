const PAYMONGO_SECRET_KEY =
  process.env.PAYMONGO_SECRET_KEY;

if (!PAYMONGO_SECRET_KEY) {
  throw new Error(
    'PAYMONGO_SECRET_KEY environment variable is missing.',
  );
}

const BASE_URL =
  'https://api.paymongo.com/v1';

const encodedKey =
  Buffer.from(
    `${PAYMONGO_SECRET_KEY}:`,
  ).toString('base64');

const FETCH_TIMEOUT_MS =
  15_000;

const MAX_RETRIES =
  3;

const RETRY_DELAY_MS =
  1_000;

export type PayMongoPaymentMethodType =
  | 'card'
  | 'gcash'
  | 'paymaya'
  | 'qrph';

interface CreatePaymentLinkPayload {
  amount: number;
  description: string;
  remarks?: string;
}

interface CreatePaymentIntentPayload {
  amount: number;
  paymentMethod: PayMongoPaymentMethodType;
  description: string;
  statementDescriptor?: string;
  metadata?: Record<string, string>;
}

function getDetailFromPayMongoResponse(
  json: any,
  fallback: string,
) {
  return (
    json?.errors?.[0]?.detail ||
    json?.errors?.[0]?.code ||
    json?.error ||
    fallback
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number =
    FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(
  ms: number,
): Promise<void> {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms,
      ),
  );
}

async function parsePayMongoJson(
  response: Response,
) {
  const responseText =
    await response.text();

  try {
    return JSON.parse(
      responseText,
    );
  } catch {
    throw new Error(
      `PayMongo returned a non-JSON response (HTTP ${response.status}).`,
    );
  }
}

function getHeaders(
  includeContentType = true,
) {
  return {
    ...(includeContentType
      ? {
          'Content-Type':
            'application/json',
        }
      : {}),
    Authorization:
      `Basic ${encodedKey}`,
  };
}

/* ============================================================================
   PAYMENT INTENT — DIRECT PAYMENT METHOD FLOW
   ========================================================================== */

export async function createPaymongoPaymentIntent(
  payload: CreatePaymentIntentPayload,
) {
  const requestBody = {
    data: {
      attributes: {
        amount:
          payload.amount,

        currency:
          'PHP',

        payment_method_allowed: [
          payload.paymentMethod,
        ],

        description:
          payload.description,

        capture_type:
          'automatic',

        ...(payload.statementDescriptor
          ? {
              statement_descriptor:
                payload.statementDescriptor,
            }
          : {}),

        ...(payload.metadata
          ? {
              metadata:
                payload.metadata,
            }
          : {}),
      },
    },
  };

  const url =
    `${BASE_URL}/payment_intents`;

  let lastError:
    Error | null = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers:
              getHeaders(),
            body: JSON.stringify(
              requestBody,
            ),
          },
        );

      const json =
        await parsePayMongoJson(
          response,
        );

      if (
        response.status >= 500 &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(
          getDetailFromPayMongoResponse(
            json,
            'Unable to create PayMongo Payment Intent.',
          ),
        );
      }

      const resource =
        json?.data;

      if (!resource?.id) {
        throw new Error(
          'PayMongo did not return a Payment Intent resource.',
        );
      }

      return {
        id:
          resource.id,
        type:
          resource.type,
        clientKey:
          resource.attributes
            ?.client_key,
        status:
          resource.attributes
            ?.status,
        amount:
          resource.attributes
            ?.amount,
        currency:
          resource.attributes
            ?.currency,
        paymentMethodAllowed:
          resource.attributes
            ?.payment_method_allowed,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      const message =
        lastError.message.toLowerCase();

      const retryable =
        message.includes('aborted') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('non-json') ||
        message.includes('5xx');

      if (
        retryable &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      break;
    }
  }

  throw (
    lastError ||
    new Error(
      'Failed to create PayMongo Payment Intent after retries.',
    )
  );
}

export async function getPaymongoPaymentIntent(
  paymentIntentId: string,
) {
  const url =
    `${BASE_URL}/payment_intents/${encodeURIComponent(
      paymentIntentId,
    )}`;

  let lastError:
    Error | null = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers:
              getHeaders(false),
          },
        );

      const json =
        await parsePayMongoJson(
          response,
        );

      if (
        response.status >= 500 &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(
          getDetailFromPayMongoResponse(
            json,
            'Unable to retrieve PayMongo Payment Intent.',
          ),
        );
      }

      return json;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      const message =
        lastError.message.toLowerCase();

      const retryable =
        message.includes('aborted') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('non-json');

      if (
        retryable &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      break;
    }
  }

  throw (
    lastError ||
    new Error(
      'Failed to retrieve PayMongo Payment Intent after retries.',
    )
  );
}

/* ============================================================================
   LEGACY PAYMENT LINKS — KEPT SO OTHER AUTOCare CALLERS DO NOT BREAK
   ========================================================================== */

export async function createPaymongoPaymentLink(
  payload: CreatePaymentLinkPayload,
) {
  const requestBody = {
    data: {
      attributes: {
        amount:
          payload.amount,
        description:
          payload.description,
        remarks:
          payload.remarks || '',
      },
    },
  };

  const url =
    `${BASE_URL}/links`;

  let lastError:
    Error | null = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers:
              getHeaders(),
            body: JSON.stringify(
              requestBody,
            ),
          },
        );

      const json =
        await parsePayMongoJson(
          response,
        );

      if (
        response.status >= 500 &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(
          getDetailFromPayMongoResponse(
            json,
            'Unable to create PayMongo payment link.',
          ),
        );
      }

      const link =
        json?.data;

      return {
        checkoutUrl:
          link?.attributes
            ?.checkout_url ??
          link?.attributes?.url,

        referenceNumber:
          link?.attributes
            ?.reference_number,

        id:
          link?.id,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      const message =
        lastError.message.toLowerCase();

      const retryable =
        message.includes('aborted') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('non-json');

      if (
        retryable &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      break;
    }
  }

  throw (
    lastError ||
    new Error(
      'Failed to create payment link after retries.',
    )
  );
}

export async function getPaymentLinkStatus(
  linkId: string,
) {
  const url =
    `${BASE_URL}/links/${encodeURIComponent(
      linkId,
    )}`;

  let lastError:
    Error | null = null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    try {
      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers:
              getHeaders(false),
          },
        );

      const json =
        await parsePayMongoJson(
          response,
        );

      if (
        response.status >= 500 &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(
          getDetailFromPayMongoResponse(
            json,
            'Failed to fetch payment link status.',
          ),
        );
      }

      const link =
        json?.data;

      const payments =
        link?.attributes
          ?.payments || [];

      const paidPayment =
        payments.find(
          (payment: any) =>
            payment?.attributes
              ?.status === 'paid',
        );

      return {
        id:
          link?.id,
        amount:
          link?.attributes?.amount,
        status:
          link?.attributes?.status,
        isPaid:
          Boolean(paidPayment),
        referenceNumber:
          link?.attributes
            ?.reference_number,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              String(error),
            );

      const message =
        lastError.message.toLowerCase();

      const retryable =
        message.includes('aborted') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('non-json');

      if (
        retryable &&
        attempt < MAX_RETRIES
      ) {
        await sleep(
          RETRY_DELAY_MS *
            Math.pow(2, attempt),
        );
        continue;
      }

      break;
    }
  }

  throw (
    lastError ||
    new Error(
      'Failed to fetch payment link status after retries.',
    )
  );
}
