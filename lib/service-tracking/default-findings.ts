/* ================================================================
   DEFAULT FINDINGS API
================================================================ */

export interface DefaultFindingPartInput {
  id?: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

export interface DefaultFindingInput {
  title: string;
  isActive?: boolean;
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
