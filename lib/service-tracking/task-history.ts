export const taskHistoryApi = {
  // Get history for a specific appointment (or all if all=true)
  list: async (params?: { appointmentId?: string; all?: boolean; search?: string; phase?: string }) => {
    const query = new URLSearchParams();
    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    if (params?.all) query.set('all', 'true');
    if (params?.search) query.set('search', params.search);
    if (params?.phase) query.set('phase', params.phase);
    const qs = query.toString();
    const url = `/api/service-tracking/task-history${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  // Record multiple tasks into history
  createMany: async (data: { appointmentId: string; phase: string; tasks: Array<{ title: string; durationMinutes?: number }> }) => {
    const res = await fetch('/api/service-tracking/task-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};