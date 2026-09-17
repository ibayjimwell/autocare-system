/* ================================================================
   TASK HISTORY API
================================================================ */

export interface TaskHistoryListParams {
  appointmentId?: string;
  excludeAppointmentId?: string;
  all?: boolean;
  search?: string;
  phase?: 'INSPECTION' | 'WORK' | string;
}

export interface TaskHistoryCreateInput {
  appointmentId: string;
  phase: 'INSPECTION' | 'WORK';
  tasks: Array<{
    title: string;
    durationMinutes?: number | null;
  }>;
}

export const taskHistoryApi = {
  list: async (params?: TaskHistoryListParams) => {
    const query = new URLSearchParams();

    if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
    if (params?.excludeAppointmentId) {
      query.set('excludeAppointmentId', params.excludeAppointmentId);
    }
    if (params?.all) query.set('all', 'true');
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.phase) query.set('phase', params.phase);

    const qs = query.toString();
    const res = await fetch(
      `/api/service-tracking/task-history${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    );

    return res.json();
  },

  createMany: async (data: TaskHistoryCreateInput) => {
    const res = await fetch('/api/service-tracking/task-history', {
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
