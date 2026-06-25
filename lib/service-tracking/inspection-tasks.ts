// lib/service-tracking/inspection-tasks.ts

export const inspectionTasksApi = {
  // GET all inspection tasks for an appointment
  list: async (appointmentId: string) => {
    const query = new URLSearchParams({ appointmentId });
    const res = await fetch(`/api/service-tracking/inspection-tasks?${query.toString()}`);
    return res.json();
  },

  // CREATE a new inspection task
  create: async (data: { appointmentId: string; title: string; order?: number }) => {
    const res = await fetch('/api/service-tracking/inspection-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // UPDATE task status (PENDING, IN_PROGRESS, DONE)
  updateStatus: async (taskId: string, status: string) => {
    const res = await fetch(`/api/service-tracking/inspection-tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
};