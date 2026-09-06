'use client';

import { useCallback } from 'react';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { useRealtimeTable } from './useRealtimeTable';

interface UseRealtimeCustomerMonitorProps {
  onDataChanged: (
    payload: RealtimePostgresChangesPayload<any>
  ) => void;
}

export function useRealtimeCustomerMonitor({
  onDataChanged,
}: UseRealtimeCustomerMonitorProps) {
  const handleChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>
      ) => {
        console.log(
          '👥 Customer change detected:',
          payload.eventType
        );

        onDataChanged(payload);
      },
      [onDataChanged]
    );

  useRealtimeTable(
    'customers',
    undefined,
    handleChange
  );
}