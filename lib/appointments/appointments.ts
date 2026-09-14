/* ================================================================
   APPOINTMENTS API
================================================================ */

export const appointmentsApi = {
  /* ==============================================================
     LIST APPOINTMENTS
  ============================================================== */

  list: async (
    params?: {
      status?: string;

      customerId?: string;

      from?: string;

      to?: string;

      page?: number;

      limit?: number;
    },
  ) => {
    let url =
      '/api/appointments';

    if (
      params
    ) {
      const query =
        new URLSearchParams();

      Object.entries(
        params,
      ).forEach(
        (
          [
            key,
            value,
          ],
        ) => {
          if (
            value !==
              undefined &&
            value !==
              null
          ) {
            query.set(
              key,
              String(
                value,
              ),
            );
          }
        },
      );

      const qs =
        query.toString();

      if (
        qs
      ) {
        url +=
          '?' +
          qs;
      }
    }

    const res =
      await fetch(
        url,
        {
          method:
            'GET',
          cache:
            'no-store',
          headers: {
            Accept:
              'application/json',
          },
        },
      );

    return res.json();
  },

  /* ==============================================================
     GET APPOINTMENT
  ============================================================== */

  get: async (
    id: string,
  ) => {
    const res =
      await fetch(
        `/api/appointments/${id}`,
        {
          method:
            'GET',
          cache:
            'no-store',
          headers: {
            Accept:
              'application/json',
          },
        },
      );

    return res.json();
  },

  /* ==============================================================
     CREATE APPOINTMENT
  ============================================================== */

  create: async (
    data: {
      customerId: string;

      vehicleId: string;

      services: string[];

      appointmentDate: string;

      appointmentTime: string;

      notes?: string;
    },
  ) => {
    const formData =
      new FormData();

    formData.append(
      'customerId',
      data.customerId,
    );

    formData.append(
      'vehicleId',
      data.vehicleId,
    );

    formData.append(
      'services',
      JSON.stringify(
        data.services,
      ),
    );

    formData.append(
      'appointmentDate',
      data.appointmentDate,
    );

    formData.append(
      'appointmentTime',
      data.appointmentTime,
    );

    if (
      data.notes
    ) {
      formData.append(
        'notes',
        data.notes,
      );
    }

    const res =
      await fetch(
        '/api/appointments',
        {
          method:
            'POST',
          body:
            formData,
        },
      );

    return res.json();
  },

  /* ==============================================================
     UPDATE APPOINTMENT
  ============================================================== */

  update: async (
    id: string,
    data: {
      appointmentDate?: string;

      appointmentTime?: string;

      services?: string[];

      notes?: string;
    },
  ) => {
    const res =
      await fetch(
        `/api/appointments/${id}`,
        {
          method:
            'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              data,
            ),
        },
      );

    return res.json();
  },

  /* ==============================================================
     UPDATE STATUS
     
     Used by:
       - Confirm
       - Decline
       - Cancel Appointment
     
     Cancellation reason is passed through `reason`.
  ============================================================== */

  updateStatus: async (
    id: string,
    status: string,
    reason?: string,
    changedBy?: string,
  ) => {
    const res =
      await fetch(
        `/api/appointments/${id}/status`,
        {
          method:
            'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body:
            JSON.stringify(
              {
                status,

                reason:
                  reason ||
                  undefined,

                changedBy:
                  changedBy ||
                  undefined,
              },
            ),
        },
      );

    /*
     * Always return the API JSON body.
     *
     * The backend cancellation route returns a proper JSON response.
     */
    return res.json();
  },

  /* ==============================================================
     HISTORY
  ============================================================== */

  getHistory: async (
    id: string,
  ) => {
    const res =
      await fetch(
        `/api/appointments/${id}/history`,
        {
          method:
            'GET',
          cache:
            'no-store',
        },
      );

    return res.json();
  },

  /* ==============================================================
     AVAILABLE SLOTS
  ============================================================== */

  getAvailableSlots: async (
    date: string,
    serviceIds: string[],
  ) => {
    const query =
      new URLSearchParams();

    query.set(
      'date',
      date,
    );

    query.set(
      'serviceIds',
      serviceIds.join(
        ',',
      ),
    );

    const res =
      await fetch(
        `/api/appointments/available-slots?${query.toString()}`,
        {
          method:
            'GET',
          cache:
            'no-store',
        },
      );

    return res.json();
  },

  /* ==============================================================
     CHECK AVAILABILITY
  ============================================================== */

  checkAvailability: async (
    date: string,
    startTime: string,
    serviceIds: string[],
  ) => {
    const res =
      await fetch(
        '/api/appointments/check-availability',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              {
                date,

                startTime,

                serviceIds,
              },
            ),
        },
      );

    return res.json();
  },

  /* ==============================================================
     CUSTOMER HISTORY
  ============================================================== */

  getHistoryForCustomer:
    async (
      customerId: string,
    ) => {
      const res =
        await fetch(
          `/api/customers/${customerId}/appointments-history`,
          {
            method:
              'GET',
            cache:
              'no-store',
          },
        );

      return res.json();
    },
};