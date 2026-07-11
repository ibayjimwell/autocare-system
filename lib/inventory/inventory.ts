export const inventoryApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = qs ? `/api/inventory?${qs}` : '/api/inventory';
    const res = await fetch(url);
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: any) => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    return res.json();
  },
  restock: async (itemId: string, quantity: number) => {
    const res = await fetch('/api/inventory/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    });
    return res.json();
  },
};

export const posApi = {
  createTransaction: async (data: { items: any[]; paymentReceived: number; staffId?: string }) => {
    const res = await fetch('/api/inventory/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
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
    const url = qs ? `/api/inventory/pos/history?${qs}` : '/api/inventory/pos/history';
    const res = await fetch(url);
    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      try { const errData = await res.json(); errorMessage = errData.errorMessage || errorMessage; } catch {}
      return { error: true, errorMessage };
    }
    return res.json();
  },
};