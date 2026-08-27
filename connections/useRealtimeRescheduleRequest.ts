'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeRescheduleRequestProps {
  appointmentId: string;
  onDataChanged: () => void;
}

export function useRealtimeRescheduleRequest({
  appointmentId,
  onDataChanged,
}: UseRealtimeRescheduleRequestProps) {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('🔄 Reschedule request changed, refreshing...');
      onDataChanged();
    },
    [onDataChanged]
  );

  useRealtimeTable(
    'appointment_reschedule_requests',
    `appointment_id=eq.${appointmentId}`,
    handleChange
  );
}