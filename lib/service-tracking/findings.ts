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
      inventoryItemId?: string | null;
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

  // UPDATE a single finding
  update: async (findingId: string, data: { description: string; parts?: Array<{
    id?: string;
    inventoryItemId?: string | null;
    partName?: string;
    quantity?: number;
    priceAtTime?: number;
    isPms?: boolean;
  }> }) => {
    const res = await fetch(`/api/service-tracking/findings/${findingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // DELETE a finding
  delete: async (findingId: string) => {
    const res = await fetch(`/api/service-tracking/findings/${findingId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};

/* ================================================================
   DEFAULT FINDINGS API
================================================================ */

export interface DefaultFindingPartInput {
  id?: string;
  inventoryItemId?: string | null;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

export interface DefaultFindingInput {
  title: string;
  parts?: DefaultFindingPartInput[];
}

export const defaultFindingsApi = {
  list: async () => {
    const res = await fetch('/api/service-tracking/default-findings', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return res.json();
  },

  create: async (data: DefaultFindingInput) => {
    const res = await fetch('/api/service-tracking/default-findings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (id: string, data: Partial<DefaultFindingInput>) => {
    const res = await fetch(`/api/service-tracking/default-findings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`/api/service-tracking/default-findings/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    return res.json();
  },
};
