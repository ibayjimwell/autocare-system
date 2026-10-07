const parseJsonResponse = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok && body && typeof body === "object" && body.error === undefined) {
    return { ...body, error: true, errorMessage: body.errorMessage || `Request failed (${res.status})` };
  }
  return body;
};

export const paymentsPosApi = {
  createTransaction: async (data: {
    items: any[];
    paymentReceived: number;
  }) => {
    const res = await fetch('/api/payments/pos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },

  getHistory: async (params?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = qs ? `/api/payments/pos/history?${qs}` : '/api/payments/pos/history';
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return parseJsonResponse(res);
  },
};
