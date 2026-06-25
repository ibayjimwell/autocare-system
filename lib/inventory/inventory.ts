// lib/inventory/inventory.ts

export const inventoryApi = {
  // LIST inventory with optional search and pagination
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

  // CREATE inventory item
  create: async (data: {
    name: string;
    description?: string;
    quantity?: number;
    unit: string;
    price?: number;
    reorderLevel?: number;
    active?: boolean;
  }) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // UPDATE inventory item
  update: async (id: string, data: {
    name?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    price?: number;
    reorderLevel?: number;
    active?: boolean;
  }) => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // DELETE inventory item
  delete: async (id: string) => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};