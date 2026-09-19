/* ================================================================
   RECEIPT API
================================================================ */

export interface ReceiptApiResponse<T = any> {
  error?: boolean;
  errorMessage?: string;
  message?: string;
  data?: T;
  [key: string]: any;
}

export async function getReceiptByFinalBill(
  finalBillId: string,
): Promise<ReceiptApiResponse> {
  if (!finalBillId) {
    return {
      error: true,
      errorMessage: 'Missing final bill ID.',
    };
  }

  const response = await fetch(
    `/api/payments/receipts?finalBillId=${encodeURIComponent(finalBillId)}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const rawBody = await response.text();

  let body: any = null;

  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `Receipt API returned invalid JSON (HTTP ${response.status}).`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      body?.errorMessage ||
        body?.message ||
        `Failed to load receipt (HTTP ${response.status}).`,
    );
  }

  if (body?.error) {
    return body;
  }

  return {
    error: false,
    message: body?.message || 'Receipt loaded successfully.',
    data: body?.data ?? body,
  };
}

export const receiptApi = {
  getByFinalBill: getReceiptByFinalBill,
};

export default receiptApi;
