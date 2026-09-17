'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { taskHistoryApi } from '@/lib/service-tracking/task-history';
import { toast } from 'sonner';

/* ================================================================
   HISTORY TASKS HOOK
================================================================ */

export function useHistoryTasks(
  search?: string,
  phase?: 'INSPECTION' | 'WORK',
  options?: {
    enabled?: boolean;
    appointmentId?: string;
    excludeAppointmentId?: string;
    debounceMs?: number;
  },
) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const requestIdRef = useRef(0);

  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 250;

  const loadTasks = useCallback(
    async (loadOptions?: { silent?: boolean }) => {
      if (!enabled) {
        return [];
      }

      const requestId =
        requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const silent = loadOptions?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await taskHistoryApi.list({
          appointmentId:
            options?.appointmentId,
          excludeAppointmentId:
            options?.excludeAppointmentId,
          search:
            search?.trim() || undefined,
          phase:
            phase || undefined,
          all: true,
        });

        if (requestId !== requestIdRef.current) {
          return [];
        }

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to load task history.',
          );
          setTasks([]);
          return [];
        }

        const nextTasks = Array.isArray(res?.data)
          ? res.data
          : [];

        setTasks(nextTasks);
        return nextTasks;
      } catch (err: any) {
        if (requestId !== requestIdRef.current) {
          return [];
        }

        console.error(
          '[useHistoryTasks] Failed to load task history:',
          err,
        );

        toast.error(
          err?.message ||
            'Error loading task history.',
        );

        setTasks([]);
        return [];
      } finally {
        if (requestId === requestIdRef.current) {
          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [
      enabled,
      options?.appointmentId,
      options?.excludeAppointmentId,
      phase,
      search,
    ],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void loadTasks();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [
    enabled,
    debounceMs,
    loadTasks,
  ]);

  return {
    tasks,
    loading,
    refreshing,
    loadTasks,
  };
}
