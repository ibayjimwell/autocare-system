/* ================================================================
   INSPECTION TASKS API

   Provides the client-side API used by ServiceDetailPanel for the
   inspection phase of service tracking.
================================================================ */

export const inspectionTasksApi = {
  /* ==============================================================
     LIST INSPECTION TASKS
  ============================================================== */

  list: async (
    appointmentId: string,
  ) => {
    const query = new URLSearchParams({
      appointmentId,
    });

    const res = await fetch(
      `/api/service-tracking/inspection-tasks?${query.toString()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    return res.json();
  },

  /* ==============================================================
     CREATE INSPECTION TASK
  ============================================================== */

  create: async (data: {
    appointmentId: string;
    title: string;
    order?: number;
    durationMinutes?: number;
  }) => {
    const res = await fetch(
      '/api/service-tracking/inspection-tasks',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    return res.json();
  },

  /* ==============================================================
     UPDATE INSPECTION TASK STATUS
  ============================================================== */

  updateStatus: async (
    taskId: string,
    status: string,
  ) => {
    const res = await fetch(
      `/api/service-tracking/inspection-tasks/${taskId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      },
    );

    return res.json();
  },

  /* ==============================================================
     DELETE INSPECTION TASK
  ============================================================== */

  delete: async (
    taskId: string,
  ) => {
    const res = await fetch(
      `/api/service-tracking/inspection-tasks/${taskId}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    return res.json();
  },
};
