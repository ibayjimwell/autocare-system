// lib/staffs/access.ts
const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export const accessApi = {
  get: async (staffId: string) => {
    const res = await fetch(`${API_BASE}/api/staffs/${staffId}/access?_t=${Date.now()}`, { cache: 'no-store' });
    return res.json();
  },

  listAll: async () => {
    const res = await fetch(`${API_BASE}/api/staffs/access?_t=${Date.now()}`, { cache: 'no-store' });
    return res.json();
  },

  create: async (staffId: string, permissions: Record<string, boolean>) => {
    const body = JSON.stringify(permissions);
    console.log('accessApi.create → staffId:', staffId, 'body:', body);
    const res = await fetch(`${API_BASE}/api/staffs/${staffId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.errorMessage || 'Failed to create access');
    }
    return data;
  },

  update: async (staffId: string, permissions: Record<string, boolean>) => {
    const body = JSON.stringify(permissions);
    const res = await fetch(`${API_BASE}/api/staffs/${staffId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.errorMessage || 'Failed to update access');
    }
    return data;
  },
};