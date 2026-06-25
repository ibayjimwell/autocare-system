// lib/billing/estimate.ts

export const estimateAdjustmentsApi = {
  // ADD fee to estimate
  addFee: async (estimateId: string, data: { title: string; amount: number; findingId?: string }) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ADD discount to estimate
  addDiscount: async (estimateId: string, data: { title: string; type: 'fixed' | 'percentage'; value: number }) => {
    const res = await fetch(`/api/billing/estimates/${estimateId}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};