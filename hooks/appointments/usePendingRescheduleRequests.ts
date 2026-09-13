'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { useRealtimeTable } from '@/connections/useRealtimeTable';

/* ========================================================================
   TYPES
======================================================================== */

type PendingRescheduleMap = Record<string, number>;

interface PendingRescheduleResponse {
  error?: boolean;
  errorMessage?: string;
  data?: Record<string, number>;
}

/* ========================================================================
   SHARED IN-FLIGHT REQUEST CACHE
======================================================================== */

/**
 * Shared in-flight request cache.
 *
 * This prevents duplicate batch requests when:
 *
 * - React Strict Mode mounts/unmounts/remounts
 * - multiple components request the exact same appointment IDs
 * - realtime events fire very close together
 */
const inFlightRequests = new Map<
  string,
  Promise<PendingRescheduleMap>
>();

/* ========================================================================
   BATCH API REQUEST
======================================================================== */

async function fetchPendingRescheduleMap(
  idsKey: string,
): Promise<PendingRescheduleMap> {
  const existingRequest =
    inFlightRequests.get(idsKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetch(
      `/api/appointments/reschedule-requests/pending?ids=${encodeURIComponent(
        idsKey,
      )}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pending reschedule requests: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as PendingRescheduleResponse;

    if (result.error) {
      throw new Error(
        result.errorMessage ||
          'Failed to fetch pending reschedule requests.',
      );
    }

    return result.data ?? {};
  })();

  inFlightRequests.set(
    idsKey,
    request,
  );

  try {
    return await request;
  } finally {
    inFlightRequests.delete(idsKey);
  }
}

/* ========================================================================
   HOOK
======================================================================== */

/**
 * Loads pending reschedule request counts for a collection of appointments
 * using ONE batch API request.
 *
 * REALTIME:
 *
 * - appointment_reschedule_requests INSERT
 * - appointment_reschedule_requests UPDATE
 * - appointment_reschedule_requests DELETE
 * - appointments UPDATE
 *
 * will trigger a fresh batch read automatically.
 *
 * The database remains the source of truth.
 */
export function usePendingRescheduleRequests(
  appointmentIds: string[],
) {
  /* ----------------------------------------------------------------------
     STATE
  ---------------------------------------------------------------------- */

  const [
    pendingMap,
    setPendingMap,
  ] =
    useState<PendingRescheduleMap>({});

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  /* ----------------------------------------------------------------------
     REQUEST SEQUENCING
  ---------------------------------------------------------------------- */

  const requestSequenceRef =
    useRef(0);

  /*
   * Prevent multiple realtime events from immediately
   * generating multiple API reads.
   */
  const realtimeRefreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  /*
   * Prevent the realtime callback from refreshing after
   * the component has already unmounted.
   */
  const mountedRef =
    useRef(false);

  /* ----------------------------------------------------------------------
     NORMALIZE APPOINTMENT IDS
  ---------------------------------------------------------------------- */

  const normalizedIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            appointmentIds
              .filter(
                (
                  id,
                ): id is string =>
                  typeof id === 'string' &&
                  id.trim().length > 0,
              )
              .map(
                (id) =>
                  id.trim(),
              ),
          ),
        ).sort(),
      [appointmentIds],
    );

  const idsKey =
    normalizedIds.join(',');

  /* ----------------------------------------------------------------------
     LOAD FROM API
  ---------------------------------------------------------------------- */

  const loadPendingRequests =
    useCallback(
      async (
        silent = false,
      ) => {
        /*
         * If there are no appointments:
         * reset everything immediately.
         */
        if (
          normalizedIds.length === 0
        ) {
          setPendingMap({});

          if (!silent) {
            setLoading(false);
          }

          return;
        }

        const requestSequence =
          ++requestSequenceRef.current;

        if (!silent) {
          setLoading(true);
        }

        try {
          const result =
            await fetchPendingRescheduleMap(
              idsKey,
            );

          /*
           * Ignore an older response if a newer
           * request has already started.
           */
          if (
            requestSequence !==
            requestSequenceRef.current
          ) {
            return;
          }

          if (!mountedRef.current) {
            return;
          }

          setPendingMap(
            result,
          );
        } catch (error) {
          if (
            requestSequence ===
              requestSequenceRef.current &&
            mountedRef.current
          ) {
            console.error(
              '[usePendingRescheduleRequests] Request failed:',
              error,
            );

            setPendingMap({});
          }
        } finally {
          if (
            !silent &&
            requestSequence ===
              requestSequenceRef.current &&
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        idsKey,
        normalizedIds.length,
      ],
    );

  /* ----------------------------------------------------------------------
     INITIAL LOAD
  ---------------------------------------------------------------------- */

  useEffect(() => {
    mountedRef.current =
      true;

    void loadPendingRequests();

    return () => {
      mountedRef.current =
        false;

      if (
        realtimeRefreshTimerRef.current
      ) {
        clearTimeout(
          realtimeRefreshTimerRef.current,
        );

        realtimeRefreshTimerRef.current =
          null;
      }
    };
  }, [
    idsKey,
    loadPendingRequests,
  ]);

  /* ----------------------------------------------------------------------
     REALTIME REFRESH SCHEDULER
  ---------------------------------------------------------------------- */

  const scheduleRealtimeRefresh =
    useCallback(
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        /*
         * Do not queue multiple refreshes.
         *
         * This is particularly important because approving a
         * reschedule can result in multiple PostgreSQL realtime
         * events in a very short period:
         *
         * 1. appointment_reschedule_requests UPDATE
         * 2. appointments UPDATE
         *
         * We want one authoritative API read after those events.
         */
        if (
          realtimeRefreshTimerRef.current
        ) {
          clearTimeout(
            realtimeRefreshTimerRef.current,
          );
        }

        realtimeRefreshTimerRef.current =
          setTimeout(
            () => {
              realtimeRefreshTimerRef.current =
                null;

              if (
                !mountedRef.current
              ) {
                return;
              }

              void loadPendingRequests(
                true,
              );
            },
            100,
          );
      },
      [
        loadPendingRequests,
      ],
    );

  /* ----------------------------------------------------------------------
     REALTIME: RESCHEDULE REQUESTS
  ---------------------------------------------------------------------- */

  const handleRescheduleRequestRealtime =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '🔄 [Realtime] Appointment reschedule request changed:',
          payload.eventType,
        );

        const changedAppointmentId =
          payload.new?.appointment_id ??
          payload.old?.appointment_id ??
          null;

        /*
         * If we know the appointment ID and it is not part
         * of this hook's current appointment collection,
         * there is no reason to refresh this particular map.
         */
        if (
          changedAppointmentId &&
          normalizedIds.length > 0 &&
          !normalizedIds.includes(
            changedAppointmentId,
          )
        ) {
          return;
        }

        scheduleRealtimeRefresh();
      },
      [
        normalizedIds,
        scheduleRealtimeRefresh,
      ],
    );

  useRealtimeTable(
    'appointment_reschedule_requests',
    undefined,
    handleRescheduleRequestRealtime,
  );

  /* ----------------------------------------------------------------------
     REALTIME: APPOINTMENTS
  ---------------------------------------------------------------------- */

  const handleAppointmentRealtime =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '🔄 [Realtime] Appointment changed:',
          payload.eventType,
        );

        const appointmentId =
          payload.new?.id ??
          payload.old?.id ??
          null;

        if (
          appointmentId &&
          normalizedIds.length > 0 &&
          !normalizedIds.includes(
            appointmentId,
          )
        ) {
          return;
        }

        /*
         * This covers approved reschedules because
         * approval changes Appointments.appointmentDate
         * and/or Appointments.appointmentTime.
         */
        scheduleRealtimeRefresh();
      },
      [
        normalizedIds,
        scheduleRealtimeRefresh,
      ],
    );

  useRealtimeTable(
    'appointments',
    undefined,
    handleAppointmentRealtime,
  );

  /* ----------------------------------------------------------------------
     MANUAL REFRESH
  ---------------------------------------------------------------------- */

  const refresh =
    useCallback(
      async () => {
        await loadPendingRequests(
          true,
        );
      },
      [
        loadPendingRequests,
      ],
    );

  /* ----------------------------------------------------------------------
     RETURN
  ---------------------------------------------------------------------- */

  return {
    pendingMap,
    loading,
    refresh,
  };
}

export type {
  PendingRescheduleMap,
};