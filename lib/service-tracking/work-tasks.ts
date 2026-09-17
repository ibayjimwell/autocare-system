/* ================================================================
   WORK TASKS API

   Provides the client-side API used by ServiceDetailPanel for the
   repair/work phase of service tracking.
================================================================ */

export const workTasksApi = {
  /* ==============================================================
     LIST WORK TASKS
  ============================================================== */

  list: async (
    appointmentId: string,
  ) => {
    const query = new URLSearchParams({
      appointmentId,
    });

    const res = await fetch(
      `/api/service-tracking/work-tasks?${query.toString()}`,
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
     CREATE WORK TASK
  ============================================================== */

  create: async (data: {
    appointmentId: string;
    title: string;
    order?: number;
    durationMinutes?: number;
  }) => {
    const res = await fetch(
      '/api/service-tracking/work-tasks',
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
     UPDATE WORK TASK STATUS
  ============================================================== */

  updateStatus: async (
    taskId: string,
    status: string,
  ) => {
    const res = await fetch(
      `/api/service-tracking/work-tasks/${taskId}/status`,
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
     DELETE WORK TASK
  ============================================================== */

  delete: async (
    taskId: string,
  ) => {
    const res = await fetch(
      `/api/service-tracking/work-tasks/${taskId}`,
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
