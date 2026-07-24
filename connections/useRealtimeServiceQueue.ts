// connections/useRealtimeServiceQueue.ts
'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeServiceQueueProps {
  onDataChanged: () => void;
  date: string;   // YYYY-MM-DD
}

export function useRealtimeServiceQueue({ onDataChanged, date }: UseRealtimeServiceQueueProps) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📋 Queue change detected, refreshing...');
      onDataChanged();
    },
    [onDataChanged]
  );

  // Subscribe only to changes for the given date
  useRealtimeTable('service_queue', `queue_date=eq.${date}`, handleChange);
}