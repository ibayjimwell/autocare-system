// lib/paymongo.ts
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
if (!PAYMONGO_SECRET_KEY) {
  throw new Error('PAYMONGO_SECRET_KEY environment variable is missing.');
}

const BASE_URL = 'https://api.paymongo.com/v1';
const encodedKey = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');

const FETCH_TIMEOUT_MS = 15_000;         // 15 seconds per attempt
const MAX_RETRIES = 3;                   // total attempts = 4 (initial + 3)
const RETRY_DELAY_MS = 1_000;            // initial backoff (1 sec), doubles each retry

interface CreatePaymentLinkPayload {
  amount: number;          // in centavos
  description: string;
  remarks?: string;
}

// ----------------------------------------------------------------------------
// Helper: fetch with timeout
// ----------------------------------------------------------------------------
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Helper: sleep
// ----------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------------------------------
// createPaymongoPaymentLink – with retry
// ----------------------------------------------------------------------------
export async function createPaymongoPaymentLink(payload: CreatePaymentLinkPayload) {
  const requestBody = {
    data: {
      attributes: {
        amount: payload.amount,
        description: payload.description,
        remarks: payload.remarks || '',
      },
    },
  };

  const requestHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${encodedKey}`,
  };

  const url = `${BASE_URL}/links`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[PayMongo] Attempt ${attempt + 1} – Request URL:`, url);
      console.log('[PayMongo] Request Headers:', JSON.stringify(requestHeaders));
      console.log('[PayMongo] Request Body:', JSON.stringify(requestBody));

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        },
        FETCH_TIMEOUT_MS
      );

      console.log('[PayMongo] Response Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('[PayMongo] Raw Response (first 2000 chars):', responseText.substring(0, 2000));

      // If 5xx and we have retries left, wait and retry
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[PayMongo] 5xx error (${response.status}). Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      // Try to parse JSON
      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch {
        console.error('[PayMongo] Non-JSON response:', responseText);
        throw new Error(
          `PayMongo returned non-JSON response (status ${response.status}). ` +
          `Body start: ${responseText.substring(0, 200)}`
        );
      }

      if (!response.ok) {
        const detail = json?.errors?.[0]?.detail || json?.error || 'Unknown PayMongo error';
        console.error('[PayMongo] API error:', JSON.stringify(json));
        throw new Error(detail);
      }

      // Success
      const link = json.data;
      return {
        checkoutUrl: link.attributes.checkout_url,
        referenceNumber: link.attributes.reference_number,
        id: link.id,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // If it's an abort/timeout error, log and possibly retry
      if (lastError.message.includes('aborted') && attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[PayMongo] Request timed out. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      // If it's not a retriable error, break
      if (!lastError.message.includes('Gateway Timeout') && !lastError.message.includes('timed out') && !lastError.message.includes('5xx')) {
        break;
      }
    }
  }

  throw lastError || new Error('Failed to create payment link after retries');
}

// ----------------------------------------------------------------------------
// getPaymentLinkStatus – with retry (optional)
// ----------------------------------------------------------------------------
export async function getPaymentLinkStatus(linkId: string) {
  const url = `${BASE_URL}/links/${linkId}`;
  const headers = { Authorization: `Basic ${encodedKey}` };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[PayMongo Status] Attempt ${attempt + 1} – URL:`, url);
      const response = await fetchWithTimeout(
        url,
        { method: 'GET', headers },
        FETCH_TIMEOUT_MS
      );

      console.log('[PayMongo Status] Response Status:', response.status);

      const responseText = await response.text();
      console.log('[PayMongo Status] Raw body (first 2000 chars):', responseText.substring(0, 2000));

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[PayMongo Status] 5xx (${response.status}). Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch {
        console.error('[PayMongo Status] Non-JSON response:', responseText);
        throw new Error('PayMongo returned non-JSON response');
      }

      if (!response.ok) {
        const detail = json?.errors?.[0]?.detail || 'Failed to fetch payment link status';
        throw new Error(detail);
      }

      const link = json.data;
      const payments = link.attributes.payments || [];
      const isPaid = payments.some((p: any) => p.attributes.status === 'paid');
      return {
        id: link.id,
        amount: link.attributes.amount,
        status: link.attributes.status,
        isPaid,
        referenceNumber: link.attributes.reference_number,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('aborted') && attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[PayMongo Status] Timeout. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Failed to fetch payment link status after retries');
}