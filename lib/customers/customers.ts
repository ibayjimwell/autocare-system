const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';

export const customersApi = {
  list: async (search?: string) => {
    const url = search ? `${API_BASE}/api/customers?search=${search}` : `${API_BASE}/api/customers`;
    const res = await fetch(url);
    return res.json();
  },

  get: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${id}`);
    return res.json();
  },

  create: async (data: { fullname: string; email: string; phone: string; password: string }) => {
    const formData = new FormData();
    formData.append('fullname', data.fullname);
    formData.append('email', data.email);
    formData.append('phone', data.phone);
    formData.append('password', data.password);
    const res = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  update: async (id: string, data: { fullname?: string; email?: string; phone?: string }) => {
    const res = await fetch(`${API_BASE}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deactivate: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${id}/deactivate`, {
      method: 'PUT',
    });
    return res.json();
  },

  reactivate: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${id}/reactivate`, {
      method: 'PUT',
    });
    return res.json();
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
};