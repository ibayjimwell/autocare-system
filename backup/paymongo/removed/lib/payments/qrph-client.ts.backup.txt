const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

export const QRPH_EXPIRY_SECONDS = 1800;

function getPaymongoPublicKey() {
  const publicKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;

  if (!publicKey || !publicKey.trim()) {
    throw new Error(
      'NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY is missing. Add your PayMongo public key to the web environment.',
    );
  }

  return publicKey.trim();
}

function basicAuth(publicKey: string) {
  if (typeof window === 'undefined' || typeof window.btoa !== 'function') {
    throw new Error('QRPh payment setup must run in the browser.');
  }

  return `Basic ${window.btoa(`${publicKey}:`)}`;
}

async function parsePayMongoResponse(response: Response) {
  const text = await response.text();

  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `PayMongo returned an invalid response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.detail ||
        json?.errors?.[0]?.code ||
        json?.error ||
        'PayMongo could not prepare the QRPh payment.',
    );
  }

  return json;
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;

  if (
    normalized.startsWith('data:image/') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('http://')
  ) {
    return normalized;
  }

  return `data:image/png;base64,${normalized}`;
}

export function getQrPhImageUrl(resource: any) {
  const attributes = resource?.data?.attributes ?? resource?.attributes ?? resource;

  return normalizeImageUrl(
    attributes?.next_action?.code?.image_url ??
      attributes?.nextAction?.code?.imageUrl ??
      null,
  );
}

export function getQrPhTestUrl(resource: any) {
  const attributes = resource?.data?.attributes ?? resource?.attributes ?? resource;

  const candidate =
    attributes?.next_action?.code?.test_url ??
    attributes?.next_action?.test_url ??
    attributes?.test_url ??
    resource?.test_url ??
    null;

  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : null;
}

export function getPaymentIntentStatus(resource: any) {
  const attributes = resource?.data?.attributes ?? resource?.attributes ?? resource;

  const value = attributes?.status ?? resource?.status ?? null;

  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

export async function createQrPhPaymentMethod() {
  const publicKey = getPaymongoPublicKey();

  const response = await fetch(`${PAYMONGO_BASE_URL}/payment_methods`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(publicKey),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          type: 'qrph',
          expiry_seconds: QRPH_EXPIRY_SECONDS,
        },
      },
    }),
  });

  const json = await parsePayMongoResponse(response);
  const paymentMethodId = json?.data?.id;

  if (!paymentMethodId) {
    throw new Error('PayMongo did not return a QRPh payment method ID.');
  }

  return paymentMethodId as string;
}

export async function attachQrPhPaymentMethod({
  paymentIntentId,
  clientKey,
  paymentMethodId,
}: {
  paymentIntentId: string;
  clientKey: string;
  paymentMethodId: string;
}) {
  const publicKey = getPaymongoPublicKey();

  const response = await fetch(
    `${PAYMONGO_BASE_URL}/payment_intents/${encodeURIComponent(paymentIntentId)}/attach`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth(publicKey),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
          },
        },
      }),
    },
  );

  return parsePayMongoResponse(response);
}
