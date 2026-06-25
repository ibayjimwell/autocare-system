// lib/service-tracking/work-tasks.ts

export const workTasksApi = {
  // GET all work tasks for an appointment
  list: async (appointmentId: string) => {
    const query = new URLSearchParams({ appointmentId });
    const res = await fetch(`/api/service-tracking/work-tasks?${query.toString()}`);
    return res.json();
  },

  // CREATE a new work task
  create: async (data: { appointmentId: string; title: string; order?: number }) => {
    const res = await fetch('/api/service-tracking/work-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // UPDATE work task status (PENDING, IN_PROGRESS, DONE)
  updateStatus: async (taskId: string, status: string) => {
    const res = await fetch(`/api/service-tracking/work-tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
};