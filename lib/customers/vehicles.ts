const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export const vehiclesApi = {
  list: async (customerId: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${customerId}/vehicles`);
    return res.json();
  },
  get: async (customerId: string, vehicleId: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${customerId}/vehicles/${vehicleId}`);
    return res.json();
  },
  create: async (customerId: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/customers/${customerId}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (customerId: string, vehicleId: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/customers/${customerId}/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (customerId: string, vehicleId: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${customerId}/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};