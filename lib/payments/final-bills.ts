// lib/payments/final-bills.ts

export const finalBillsApi = {
  // LIST final bills with optional filters
  list: async (params?: { status?: string; appointmentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.appointmentId) query.set("appointmentId", params.appointmentId);
    const qs = query.toString();
    const url = qs
      ? `/api/payments/final-bills?${qs}`
      : "/api/payments/final-bills";
    const res = await fetch(url);
    return res.json();
  },

  // GET single final bill with all details
  get: async (id: string) => {
    const res = await fetch(`/api/payments/final-bills/${id}`);
    return res.json();
  },

  // GENERATE final bill from approved estimate & completed work tasks
  generate: async (appointmentId: string) => {
    const res = await fetch("/api/service-tracking/final-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    return res.json();
  },

  // TOGGLE finding inclusion in final bill
  toggleFinding: async (billId: string, findingId: string) => {
    const res = await fetch(
      `/api/payments/final-bills/${billId}/findings/${findingId}/toggle`,
      {
        method: "PATCH",
      },
    );
    return res.json();
  },

  // TOGGLE fee inclusion in final bill (if supported)
  toggleFee: async (billId: string, feeId: string) => {
    const res = await fetch(
      `/api/payments/final-bills/${billId}/fees/${feeId}/toggle`,
      {
        method: "PATCH",
      },
    );
    return res.json();
  },

  updatePart: async (
    billId: string,
    findingId: string,
    partId: string,
    data: { quantity?: number; priceAtTime?: number },
  ) => {
    const res = await fetch(
      `/api/payments/final-bills/${billId}/findings/${findingId}/parts/${partId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return res.json();
  },
};
