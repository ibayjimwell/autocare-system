// lib/payments/estimate.ts

export const estimateAdjustmentsApi = {
  // ADD fee to estimate
  addFee: async (estimateId: string, data: { title: string; amount: number; findingId?: string }) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ADD discount to estimate
  addDiscount: async (estimateId: string, data: { title: string; type: 'fixed' | 'percentage'; value: number }) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

export const estimatesApi = {
  // LIST estimates with optional filters
  list: async (params?: { status?: string; appointmentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    const qs = query.toString();
    const url = qs ? `/api/payments/estimates?${qs}` : '/api/payments/estimates';
    const res = await fetch(url);
    return res.json();
  },

  // GET single estimate with full details
  get: async (id: string) => {
    const res = await fetch(`/api/payments/estimates/${id}`);
    return res.json();
  },

  // GENERATE estimate (POST to service-tracking)
  generate: async (appointmentId: string) => {
    const res = await fetch('/api/service-tracking/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    });
    return res.json();
  },

  // SEND estimate for approval
  sendForApproval: async (estimateId: string) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/send-for-approval`, {
      method: 'PATCH',
    });
    return res.json();
  },

  // APPROVE estimate
  approve: async (estimateId: string) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/approve`, {
      method: 'PATCH',
    });
    return res.json();
  },

  // DECLINE estimate
  decline: async (estimateId: string, reason: string) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/decline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  // TOGGLE finding inclusion
  toggleFinding: async (estimateId: string, findingId: string) => {
    const res = await fetch(`/api/payments/estimates/${estimateId}/findings/${findingId}/toggle`, {
      method: 'PATCH',
    });
    return res.json();
  },
};