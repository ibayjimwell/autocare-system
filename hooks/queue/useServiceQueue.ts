'use client';

import {
  useState,
  useCallback,
  useEffect,
} from 'react';

import {
  serviceQueueApi,
} from '@/lib/queue/service-queue';

import {
  toast,
} from 'sonner';

import {
  useRealtimeServiceQueue,
} from '@/connections/useRealtimeServiceQueue';

/* ================================================================
   HOOK
================================================================ */

export function useServiceQueue(
  date: string,
  enabled: boolean = true,
) {
  const [
    queue,
    setQueue,
  ] = useState<any[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  /* =============================================================
     LOAD QUEUE
  ============================================================= */

  const loadQueue =
    useCallback(
      async () => {
        if (
          !enabled ||
          !date
        ) {
          setQueue(
            [],
          );

          setLoading(
            false,
          );

          return;
        }

        try {
          const res =
            await serviceQueueApi.list(
              date,
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to load queue.',
            );

            setQueue(
              [],
            );

            return;
          }

          setQueue(
            Array.isArray(
              res?.data,
            )
              ? res.data
              : [],
          );
        } catch (
          error: any
        ) {
          console.error(
            '[useServiceQueue] Failed to load queue:',
            error,
          );

          toast.error(
            error?.message ||
              'Error loading queue.',
          );

          setQueue(
            [],
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        date,
        enabled,
      ],
    );

  /* =============================================================
     INITIAL LOAD / DATE CHANGE
  ============================================================= */

  useEffect(() => {
    if (
      !enabled ||
      !date
    ) {
      setQueue(
        [],
      );

      setLoading(
        false,
      );

      return;
    }

    setLoading(
      true,
    );

    void loadQueue();
  }, [
    date,
    enabled,
    loadQueue,
  ]);

  /* =============================================================
     REALTIME REFRESH

     The server remains the single source of truth.
     Both service_queue and appointments changes are observed
     by useRealtimeServiceQueue so an appointment entering
     IN_PROGRESS appears in the work queue immediately.
  ============================================================= */

  useRealtimeServiceQueue({
    onDataChanged:
      enabled &&
      date
        ? loadQueue
        : () => {},

    date,
  });

  /* =============================================================
     RETURN

     Queue order is determined by the server.
     There is intentionally no manual move/reorder behavior.
  ============================================================= */

  return {
    queue,
    loading,
    loadQueue,
  };
}

export default useServiceQueue;
