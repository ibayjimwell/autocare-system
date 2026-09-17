/* ================================================================
   FINDING HISTORY API
================================================================ */

export interface HistoryFindingListParams {
  appointmentId?: string;
  excludeAppointmentId?: string;
  search?: string;
  phase?: 'INSPECTION' | string;
  all?: boolean;
}

export interface HistoryFindingCreateInput {
  appointmentId: string;
  phase: 'INSPECTION';
  findings: Array<{
    description: string;
    parts?: Array<{
      partName: string;
      quantity: number;
      priceAtTime: number;
      isPms: boolean;
    }>;
  }>;
}

export const historyFindingsApi = {
  list: async (params?: HistoryFindingListParams) => {
    const query = new URLSearchParams();

    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    if (params?.excludeAppointmentId) {
      query.set('excludeAppointmentId', params.excludeAppointmentId);
    }
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.phase) query.set('phase', params.phase);
    if (params?.all) query.set('all', 'true');

    const qs = query.toString();
    const res = await fetch(
      `/api/service-tracking/history-findings${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    );

    return res.json();
  },

  createMany: async (data: HistoryFindingCreateInput) => {
    const res = await fetch('/api/service-tracking/history-findings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    return res.json();
  },
};
