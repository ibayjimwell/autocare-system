export const historyFindingsApi = {
  list: async (params?: { appointmentId?: string; search?: string; phase?: string; all?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    if (params?.search) query.set('search', params.search);
    if (params?.phase) query.set('phase', params.phase);
    if (params?.all) query.set('all', 'true');
    const qs = query.toString();
    const url = `/api/service-tracking/history-findings${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    return res.json();
  },
  createMany: async (data: { appointmentId: string; phase: string; findings: Array<{ description: string; parts?: Array<{ partName: string; quantity: number; priceAtTime: number; isPms: boolean }> }> }) => {
    const res = await fetch('/api/service-tracking/history-findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};