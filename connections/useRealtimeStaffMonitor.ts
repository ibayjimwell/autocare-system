// connections/useRealtimeStaffMonitor.ts
'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeStaffMonitorProps {
  onDataChanged: () => void;
}

export function useRealtimeStaffMonitor({ onDataChanged }: UseRealtimeStaffMonitorProps) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('👥 Staff change detected, refreshing...');
      onDataChanged();
    },
    [onDataChanged]
  );

  // Subscribe to all changes on 'staffs' table (no filter)
  useRealtimeTable('staffs', undefined, handleChange);
}