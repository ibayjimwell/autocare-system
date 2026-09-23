export type InventoryStockFilter = 'all' | 'healthy' | 'low' | 'out';
export type InventoryBinaryFilter = 'all' | 'true' | 'false';

export type InventoryListParams = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  stock?: InventoryStockFilter;
  active?: InventoryBinaryFilter;
  lowStockAlert?: InventoryBinaryFilter;
  unit?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minCost?: number;
  maxCost?: number;
  minSelling?: number;
  maxSelling?: number;
  dateFrom?: string;
  dateTo?: string;
};

async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text) {
    return {
      error: !res.ok,
      errorMessage: !res.ok
        ? `Request failed with status ${res.status}.`
        : undefined,
    } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: true,
      errorMessage: `Server returned an invalid JSON response (${res.status}).`,
    } as T;
  }
}

function buildQuery(params?: InventoryListParams) {
  const query = new URLSearchParams();

  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);
  if (params?.stock) query.set('stock', params.stock);
  if (params?.active) query.set('active', params.active);
  if (params?.lowStockAlert) query.set('lowStockAlert', params.lowStockAlert);
  if (params?.unit) query.set('unit', params.unit);
  if (params?.minQuantity !== undefined) query.set('minQuantity', String(params.minQuantity));
  if (params?.maxQuantity !== undefined) query.set('maxQuantity', String(params.maxQuantity));
  if (params?.minCost !== undefined) query.set('minCost', String(params.minCost));
  if (params?.maxCost !== undefined) query.set('maxCost', String(params.maxCost));
  if (params?.minSelling !== undefined) query.set('minSelling', String(params.minSelling));
  if (params?.maxSelling !== undefined) query.set('maxSelling', String(params.maxSelling));
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);

  return query.toString();
}

export const inventoryApi = {
  list: async (params?: InventoryListParams) => {
    const qs = buildQuery(params);
    const url = qs ? `/api/inventory?${qs}` : '/api/inventory';
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return parseJsonResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return parseJsonResponse(res);
  },

  lookupBarcode: async (barcode: string) => {
    const normalized = barcode.trim();
    const res = await fetch(
      `/api/inventory/barcode?barcode=${encodeURIComponent(normalized)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    );
    return parseJsonResponse(res);
  },

  create: async (data: any) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    return parseJsonResponse(res);
  },

  restock: async (itemId: string, quantity: number) => {
    const res = await fetch('/api/inventory/restock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ itemId, quantity }),
    });
    return parseJsonResponse(res);
  },
};

export const posApi = {
  createTransaction: async (data: {
    items: any[];
    paymentReceived: number;
    staffId?: string;
  }) => {
    const res = await fetch('/api/inventory/pos', {
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
    const url = qs
      ? `/api/inventory/pos/history?${qs}`
      : '/api/inventory/pos/history';

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    return parseJsonResponse(res);
  },
};
