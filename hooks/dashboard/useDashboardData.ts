'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/database/models/dashboard/dashboard.model';
import dashboardApi from '@/lib/dashboard/dashboard-api';
import { useRealtimeDashboard } from '@/connections/useRealtimeDashboard';

interface UseDashboardDataOptions {
  initialData: DashboardData;
  accessKey?: string;
}

const DASHBOARD_REQUEST_TIMEOUT_MS = 15_000;

export function useDashboardData({
  initialData,
  accessKey,
}: UseDashboardDataOptions) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialData.generatedAt === '',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const initialFetchStartedRef = useRef(false);
  const accessKeyRef = useRef(accessKey);
  const activeControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    /*
     * Realtime can report several related database changes at nearly the
     * same time. Never allow those events to create overlapping analytics
     * requests. One request is enough because the response is an aggregate
     * snapshot of all accessible modules.
     */
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    const promise = (async () => {
      if (mountedRef.current) {
        setIsRefreshing(true);
      }

      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, DASHBOARD_REQUEST_TIMEOUT_MS);

      try {
        const response = await dashboardApi.get(controller.signal);

        if (!mountedRef.current) {
          return;
        }

        if (response.data) {
          setData(response.data);
        }

        setError(null);
        setIsInitialLoading(false);
      } catch (refreshError) {
        if (!mountedRef.current) {
          return;
        }

        if (
          refreshError instanceof DOMException &&
          refreshError.name === 'AbortError'
        ) {
          setError(
            'Dashboard analytics took too long to respond. The page is still usable; use Refresh to try again.',
          );
        } else {
          console.error(
            '[useDashboardData] Failed to refresh:',
            refreshError,
          );
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : 'Unable to refresh dashboard analytics.',
          );
        }

        setIsInitialLoading(false);
      } finally {
        window.clearTimeout(timeoutId);

        if (mountedRef.current) {
          setIsRefreshing(false);
        }
      }
    })();

    inFlightRef.current = promise;

    try {
      await promise;
    } finally {
      if (inFlightRef.current === promise) {
        inFlightRef.current = null;
      }
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, []);

  /*
   * Initial analytics load happens after the Dashboard page has mounted.
   * This is the key navigation fix: the server route is no longer blocked by
   * the analytics query set.
   */
  useEffect(() => {
    mountedRef.current = true;

    if (!initialFetchStartedRef.current) {
      initialFetchStartedRef.current = true;
      void refresh();
    }

    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, [refresh]);

  /*
   * Access changes can happen while the user is already on Dashboard. The
   * session access key is intentionally used only as a trigger; the server
   * remains the authority for the actual returned modules.
   */
  useEffect(() => {
    if (!accessKeyRef.current) {
      accessKeyRef.current = accessKey;
      return;
    }

    if (
      accessKey &&
      accessKeyRef.current !== accessKey
    ) {
      accessKeyRef.current = accessKey;
      void refresh();
    }
  }, [accessKey, refresh]);

  /*
   * Do not subscribe to the large realtime table set until the first data
   * request has completed. This prevents initial navigation from racing a
   * second analytics request triggered by a live database event.
   */
  useRealtimeDashboard(
    refresh,
    !isInitialLoading,
  );

  return {
    data,
    setData,
    refresh,
    isInitialLoading,
    isRefreshing,
    error,
    visibleModules: Object.entries(data.access)
      .filter(([, allowed]) => allowed)
      .map(([module]) => module),
  };
}
