// hooks/appointments/usePendingRescheduleRequests.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';

interface PendingRequestsMap {
  [appointmentId: string]: boolean;
}

export function usePendingRescheduleRequests(appointmentIds: string[]) {
  const [pendingMap, setPendingMap] = useState<PendingRequestsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    const ids = appointmentIds.filter(Boolean);
    if (ids.length === 0) {
      setPendingMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const map: PendingRequestsMap = {};

    try {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          try {
            const res = await appointmentsApi.getRescheduleRequests(id);
            if (!res.error && res.data) {
              const pending = res.data.some((r: any) => r.status === 'PENDING');
              return { id, pending };
            }
            return { id, pending: false };
          } catch {
            return { id, pending: false };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          map[result.value.id] = result.value.pending;
        }
      }

      for (const id of ids) {
        if (!(id in map)) {
          map[id] = false;
        }
      }

      setPendingMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending reschedule requests');
      const fallback: PendingRequestsMap = {};
      for (const id of ids) {
        fallback[id] = false;
      }
      setPendingMap(fallback);
    } finally {
      setLoading(false);
    }
  }, [appointmentIds]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  return { pendingMap, loading, error };
}