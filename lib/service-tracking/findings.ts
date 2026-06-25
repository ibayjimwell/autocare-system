// lib/service-tracking/findings.ts

export const findingsApi = {
  // GET all findings for an appointment (with parts)
  list: async (appointmentId: string) => {
    const query = new URLSearchParams({ appointmentId });
    const res = await fetch(`/api/service-tracking/findings?${query.toString()}`);
    return res.json();
  },

  // RECORD findings (with parts)
  create: async (data: { appointmentId: string; findings: Array<{
    description: string;
    parts?: Array<{
      inventoryItemId?: string;
      partName?: string;
      quantity?: number;
      priceAtTime?: number;
      isPms?: boolean;
    }>;
  }> }) => {
    const res = await fetch('/api/service-tracking/findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};