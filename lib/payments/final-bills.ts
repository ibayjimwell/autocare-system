export const finalBillsApi = {
  list: async (params?: { status?: string; appointmentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    const qs = query.toString();
    const url = qs ? `/api/payments/final-bills?${qs}` : '/api/payments/final-bills';
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    return res.json();
  },

  resolveBillId: async (billId: string) => {
    const normalized = String(billId || '').trim().replace(/^#/, '').toUpperCase();
    if (!normalized) return { error: true, errorMessage: 'Bill ID is required.', data: null };

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(normalized)) return { error: false, data: normalized };

    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      return { error: true, errorMessage: 'Enter the 8-character Bill ID shown in the Final Cost table.', data: null };
    }

    try {
      const res = await finalBillsApi.list();
      if (res?.error) return { error: true, errorMessage: res.errorMessage || 'Failed to look up the Bill ID.', data: null };
      const bills = Array.isArray(res?.data) ? res.data : [];
      const matches = bills.filter((bill: any) => String(bill?.id || '').trim().toUpperCase().slice(0, 8) === normalized);
      if (matches.length === 0) return { error: true, errorMessage: `Bill ID "${normalized}" was not found.`, data: null };
      if (matches.length > 1) return { error: true, errorMessage: `Bill ID "${normalized}" matches multiple final bills. Please scan the QR code instead.`, data: null };
      return { error: false, data: matches[0].id };
    } catch (error: any) {
      return { error: true, errorMessage: error?.message || 'Failed to look up the Bill ID.', data: null };
    }
  },

  get: async (id: string) => {
    const res = await fetch(`/api/payments/final-bills/${id}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    return res.json();
  },

  generate: async (appointmentId: string) => {
    const res = await fetch('/api/service-tracking/final-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    });
    return res.json();
  },

  toggleFinding: async (billId: string, findingId: string) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/findings/${findingId}/toggle`, { method: 'PATCH' });
    return res.json();
  },

  toggleFee: async (billId: string, feeId: string) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/fees/${feeId}/toggle`, { method: 'PATCH' });
    return res.json();
  },

  updatePart: async (billId: string, findingId: string, partId: string, data: { quantity?: number; priceAtTime?: number }) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/findings/${findingId}/parts/${partId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateStatus: async (billId: string, status: string) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  park: async (billId: string, addParkingFee: boolean) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PARKED', addParkingFee }),
    });
    return res.json();
  },

  stopParking: async (billId: string) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    });
    return res.json();
  },

  addFee: async (billId: string, data: { title: string; amount: number; findingId?: string }) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  addDiscount: async (billId: string, data: { title: string; type: 'fixed' | 'percentage'; value: number }) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
