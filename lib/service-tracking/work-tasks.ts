export const workTasksApi = {
  list: async (appointmentId: string) => {
    const query = new URLSearchParams({ appointmentId });
    const res = await fetch(`/api/service-tracking/work-tasks?${query.toString()}`);
    return res.json();
  },

  create: async (data: { 
    appointmentId: string; 
    title: string; 
    order?: number;
    durationMinutes?: number;   // new
  }) => {
    const res = await fetch('/api/service-tracking/work-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateStatus: async (taskId: string, status: string) => {
    const res = await fetch(`/api/service-tracking/work-tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
};