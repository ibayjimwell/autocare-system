// connections/useRealtimeTask.ts
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeTaskProps {
  appointmentId: string;
  isInspection: boolean;
  onDataChanged: () => void;
}

export function useRealtimeTask({
  appointmentId,
  isInspection,
  onDataChanged,
}: UseRealtimeTaskProps) {
  // Keep a stable reference to the latest callback
  const callbackRef = useRef(onDataChanged);
  useEffect(() => {
    callbackRef.current = onDataChanged;
  }, [onDataChanged]);

  const table = isInspection ? 'inspection_tasks' : 'work_tasks';
  const filter = `appointment_id=eq.${appointmentId}`;

  // This handler never changes – avoids re‑subscribing unnecessarily
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log(`📡 Task change detected on ${table}, refreshing...`);
      callbackRef.current();
    },
    []
  );

  useRealtimeTable(table, filter, handleChange);
}