'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

const DASHBOARD_REALTIME_TABLES = [
  'appointments',
  'appointment_status_history',
  'customers',
  'vehicles',
  'services',
  'staffs',
  'staff_access',
  'service_queue',
  'inspection_tasks',
  'inspection_findings',
  'inspection_finding_parts',
  'work_tasks',
  'estimated_costs',
  'estimate_findings',
  'final_bills',
  'receipts',
  'inventory',
  'inventory_allocations',
  'pos_transactions',
] as const;

const REALTIME_REFRESH_DEBOUNCE_MS = 800;
const REALTIME_REFRESH_MIN_INTERVAL_MS = 2_500;

export function useRealtimeDashboard(
  onDataChanged: () => Promise<void> | void,
  enabled = true,
) {
  const callbackRef = useRef(onDataChanged);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAtRef = useRef(0);
  const dirtyWhileHiddenRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onDataChanged;
  }, [onDataChanged]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;

    const runRefresh = () => {
      if (disposed) return;

      if (typeof document !== 'undefined' && document.hidden) {
        dirtyWhileHiddenRef.current = true;
        return;
      }

      const now = Date.now();
      const elapsed = now - lastRefreshAtRef.current;

      if (elapsed < REALTIME_REFRESH_MIN_INTERVAL_MS) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(
          runRefresh,
          REALTIME_REFRESH_MIN_INTERVAL_MS - elapsed,
        );
        return;
      }

      lastRefreshAtRef.current = now;
      dirtyWhileHiddenRef.current = false;

      try {
        void callbackRef.current();
      } catch (error) {
        console.error(
          '[Dashboard Realtime] Refresh callback failed:',
          error,
        );
      }
    };

    const scheduleRefresh = () => {
      if (disposed) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(
        runRefresh,
        REALTIME_REFRESH_DEBOUNCE_MS,
      );
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && dirtyWhileHiddenRef.current) {
        scheduleRefresh();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    const channelName = `autocare-dashboard-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    console.log(
      `📡 [Dashboard Realtime] Creating channel: ${channelName}`,
    );

    let channel = supabase.channel(channelName);

    for (const table of DASHBOARD_REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          scheduleRefresh();
        },
      );
    }

    channel.subscribe((status) => {
      if (disposed) return;

      if (status === 'SUBSCRIBED') {
        console.log(
          '✅ [Dashboard Realtime] Subscribed to dashboard tables.',
        );
      } else if (status === 'CHANNEL_ERROR') {
        console.error(
          '❌ [Dashboard Realtime] Channel error.',
        );
      } else if (status === 'TIMED_OUT') {
        console.warn(
          '⏱️ [Dashboard Realtime] Subscription timed out.',
        );
      }
    });

    return () => {
      disposed = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );

      console.log(
        `🔌 [Dashboard Realtime] Removing channel: ${channelName}`,
      );
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
