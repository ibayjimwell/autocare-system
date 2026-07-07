const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export const servicesApi = {
  // GET all services, optionally filter by active
  list: async (active?: boolean) => {
    const url = active !== undefined ? `${API_BASE}/api/services?active=${active}` : `${API_BASE}/api/services`;
    const res = await fetch(url);
    return res.json();
  },

  // GET single service
  get: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/services/${id}`);
    return res.json();
  },

  create: async (data: { name: string; description?: string; basePrice?: number; durationMinutes: number; type?: string }) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.basePrice !== undefined) formData.append('basePrice', String(data.basePrice));
    formData.append('durationMinutes', String(data.durationMinutes));
    if (data.type) formData.append('type', data.type);
    const res = await fetch(`${API_BASE}/api/services`, { method: 'POST', body: formData });
    return res.json();
  },
  
  update: async (id: string, data: { name?: string; description?: string; basePrice?: number; durationMinutes?: number; type?: string }) => {
    const res = await fetch(`${API_BASE}/api/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ENABLE service
  enable: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/services/${id}/enable`, {
      method: 'POST',
    });
    return res.json();
  },

  // DISABLE service
  disable: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/services/${id}/disable`, {
      method: 'POST',
    });
    return res.json();
  },
};