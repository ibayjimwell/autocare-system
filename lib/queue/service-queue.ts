/* ================================================================
   SERVICE QUEUE API
================================================================ */

export const serviceQueueApi = {
  /* ================================================================
     GET TODAY'S QUEUE
  ================================================================= */

  list: async (
    date: string,
  ) => {
    const res =
      await fetch(
        `/api/queue?date=${encodeURIComponent(
          date,
        )}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept:
              'application/json',
          },
        },
      );

    return res.json();
  },
};