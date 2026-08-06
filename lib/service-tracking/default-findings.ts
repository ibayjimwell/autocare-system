export const defaultFindingsApi = {
  list: async () => {
    const res = await fetch('/api/service-tracking/default-findings');
    return res.json();
  },
  create: async (data: { title: string; isActive?: boolean; parts?: Array<{ partName: string; quantity: number; priceAtTime: number; isPms: boolean }> }) => {
    const res = await fetch('/api/service-tracking/default-findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (id: string, data: { title?: string; isActive?: boolean; parts?: Array<{ id?: string; partName: string; quantity: number; priceAtTime: number; isPms: boolean }> }) => {
    const res = await fetch(`/api/service-tracking/default-findings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (id: string) => {
    const res = await fetch(`/api/service-tracking/default-findings/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};