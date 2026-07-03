// connections/useRealtimeAppointment.ts
'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeAppointmentProps {
  onDataChanged: () => void;
}

export function useRealtimeAppointment({ onDataChanged }: UseRealtimeAppointmentProps) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📅 Appointment change detected, refreshing...');
      onDataChanged();
    },
    [onDataChanged]
  );

  // Subscribe to all changes on 'appointments' table (no filter)
  useRealtimeTable('appointments', undefined, handleChange);
}