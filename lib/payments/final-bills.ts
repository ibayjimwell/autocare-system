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

  updateStatus: async (billId: string, status: string, parkingFeeRate?: number, parkingFeeUnit?: string) => {
    const body: any = { status };
    if (parkingFeeRate !== undefined && parkingFeeUnit) {
      body.parkingFeeRate = parkingFeeRate;
      body.parkingFeeUnit = parkingFeeUnit;
    }
    const res = await fetch(`/api/payments/final-bills/${billId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  // Get parking fee for a HOLD bill
  getParkingFee: async (billId: string) => {
    const res = await fetch(`/api/payments/final-bills/${billId}/parking-fee`);
    return res.json();
  },
};