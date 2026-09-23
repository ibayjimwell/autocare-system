/* ================================================================
   SERVICE QUEUE API — CLIENT SAFE
================================================================ */

/*
 * IMPORTANT:
 *
 * This file is imported by client components.
 *
 * DO NOT import:
 * - @/lib/drizzle
 * - postgres
 * - drizzle-orm database objects
 * - next/server
 * - server-only utilities
 *
 * This module must contain only browser-safe API requests.
 * The actual database implementation lives in:
 *
 * app/api/queue/route.ts
 * ================================================================
 */

async function requestJson(
  url: string,
  options: RequestInit = {},
) {
  let response: Response;

  try {
    response = await fetch(
      url,
      {
        ...options,

        /*
         * Queue information should always be fresh.
         */
        cache: 'no-store',

        headers: {
          Accept:
            'application/json',

          ...(options.headers || {}),
        },
      },
    );
  } catch (error: any) {
    throw new Error(
      error?.message ||
        'Unable to connect to the queue API.',
    );
  }

  const text =
    await response.text();

  let data: any = null;

  /*
   * Parse JSON only when the server actually returned a body.
   */
  if (
    text.trim()
  ) {
    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `Queue API returned an invalid JSON response (${response.status}).`,
      );
    }
  }

  /*
   * Normalize backend errors into normal Error objects so callers
   * can continue using their existing try/catch logic.
   */
  if (
    !response.ok
  ) {
    const message =
      data?.errorMessage ||
      data?.message ||
      (
        process.env.NODE_ENV ===
        'development'
          ? data?.errorLog
          : null
      ) ||
      `Queue request failed (${response.status}).`;

    throw new Error(
      message,
    );
  }

  return data ?? {};
}

export const serviceQueueApi = {
  /* ================================================================
     LIST
  ================================================================= */

  list: async (
    date: string,
  ) => {
    return requestJson(
      `/api/queue?date=${encodeURIComponent(
        date,
      )}`,
      {
        method: 'GET',
      },
    );
  },

  /* ================================================================
     ASK CUSTOMER ABOUT ARRIVAL
  ================================================================= */

  askArriving: async (
    appointmentId: string,
  ) => {
    return requestJson(
      `/api/queue/${encodeURIComponent(
        appointmentId,
      )}/arrival-request`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            {},
          ),
      },
    );
  },

  /* ================================================================
     STAFF MARK ARRIVED
  ================================================================= */

  markArrived: async (
    appointmentId: string,
  ) => {
    return requestJson(
      `/api/queue/${encodeURIComponent(
        appointmentId,
      )}/status`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            status:
              'ARRIVED',
          }),
      },
    );
  },

  /* ================================================================
     STAFF WORK THIS
  ================================================================= */

  startWorking: async (
    appointmentId: string,
  ) => {
    return requestJson(
      `/api/queue/${encodeURIComponent(
        appointmentId,
      )}/status`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            status:
              'WORKING',
          }),
      },
    );
  },

  /* ================================================================
     GENERIC STATUS UPDATE
  ================================================================= */

  updateStatus: async (
    appointmentId: string,
    status: string,
  ) => {
    return requestJson(
      `/api/queue/${encodeURIComponent(
        appointmentId,
      )}/status`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            status,
          }),
      },
    );
  },
};