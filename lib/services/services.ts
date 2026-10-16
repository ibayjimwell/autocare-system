const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export interface ServicePayload {
  name: string; description?: string; basePrice?: number | null;
  durationMinutes: number; type: 'PMS' | 'REPAIR' | 'DIAGNOSTIC';
  subcategory?: string | null; isLaborInclude: boolean;
}

async function jsonResponse(url: string, options: RequestInit = {}) {
  const res = await fetch(url, { ...options, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok && !data?.error) return { ...data, error: true, errorMessage: data?.errorMessage || `Request failed (${res.status})` };
  return data;
}
export const servicesApi = {
  list: (active?: boolean) => jsonResponse(active === undefined ? `${API_BASE}/api/services` : `${API_BASE}/api/services?active=${active}`),
  get: (id: string) => jsonResponse(`${API_BASE}/api/services/${encodeURIComponent(id)}`),
  create: (data: ServicePayload) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    if (data.basePrice !== undefined && data.basePrice !== null) formData.append('basePrice', String(data.basePrice));
    formData.append('durationMinutes', String(data.durationMinutes));
    formData.append('type', data.type);
    formData.append('subcategory', data.type === 'REPAIR' ? (data.subcategory || '') : '');
    formData.append('isLaborInclude', String(data.isLaborInclude));
    return jsonResponse(`${API_BASE}/api/services`, { method: 'POST', body: formData });
  },
  update: (id: string, data: ServicePayload) => jsonResponse(`${API_BASE}/api/services/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  enable: (id: string) => jsonResponse(`${API_BASE}/api/services/${encodeURIComponent(id)}/enable`, { method: 'POST' }),
  disable: (id: string) => jsonResponse(`${API_BASE}/api/services/${encodeURIComponent(id)}/disable`, { method: 'POST' }),
  delete: (id: string) => jsonResponse(`${API_BASE}/api/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
