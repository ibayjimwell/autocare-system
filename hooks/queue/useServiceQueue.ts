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
   TYPES
================================================================ */

type ServiceQueueMode =
  | 'CONFIRMED'
  | 'IN_PROGRESS';

/* ================================================================
   HOOK
================================================================ */

export function useServiceQueue(
  date: string,
  enabled: boolean = true,
  mode: ServiceQueueMode = 'CONFIRMED',
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

     CONFIRMED:
       - date is required
       - only today's confirmed queue is loaded

     IN_PROGRESS:
       - date is intentionally NOT used as a filter
       - every IN_PROGRESS appointment is loaded regardless of its
         appointment date

     The server is the single source of truth for queue ordering and
     queue status.
  ============================================================= */

  const loadQueue =
    useCallback(
      async () => {
        if (
          !enabled
        ) {
          setQueue(
            [],
          );

          setLoading(
            false,
          );

          return;
        }

        if (
          mode ===
            'CONFIRMED' &&
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
              mode,
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
        mode,
      ],
    );

  /* =============================================================
     INITIAL LOAD / DATE / MODE CHANGE
  ============================================================== */

  useEffect(() => {
    if (
      !enabled ||
      (
        mode ===
          'CONFIRMED' &&
        !date
      )
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
    mode,
    loadQueue,
  ]);

  /* =============================================================
     REALTIME REFRESH

     For IN_PROGRESS the realtime connection listens to both:
       - service_queue changes
       - appointment changes

     This is important because an older appointment can enter
     IN_PROGRESS without having a service_queue row yet. An
     appointment-status change must therefore refresh the all-dates
     work queue as well.
  ============================================================== */

  useRealtimeServiceQueue({
    onDataChanged:
      enabled &&
      (
        mode ===
          'IN_PROGRESS' ||
        Boolean(date)
      )
        ? loadQueue
        : () => {},

    date,

    mode,
  });

  /* =============================================================
     RETURN

     The server remains responsible for canonical ordering.
     No client-side date filtering is applied here.
  ============================================================== */

  return {
    queue,
    loading,
    loadQueue,
  };
}

export default useServiceQueue;