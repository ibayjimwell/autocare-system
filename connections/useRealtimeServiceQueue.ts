'use client';

import {
  useCallback,
} from 'react';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import {
  useRealtimeTable,
} from './useRealtimeTable';

interface UseRealtimeServiceQueueProps {
  onDataChanged: () => void;
  date: string;
}

export function useRealtimeServiceQueue({
  onDataChanged,
  date,
}: UseRealtimeServiceQueueProps) {
  const handleServiceQueueChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '📋 [Realtime Queue] service_queue change detected:',
          payload.eventType,
        );

        onDataChanged();
      },
      [
        onDataChanged,
      ],
    );

  const handleAppointmentChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '📋 [Realtime Queue] appointment change detected:',
          payload.eventType,
        );

        onDataChanged();
      },
      [
        onDataChanged,
      ],
    );

  /* =============================================================
     SERVICE QUEUE CHANGES
  ============================================================= */

  useRealtimeTable(
    'service_queue',
    date
      ? `queue_date=eq.${date}`
      : null,
    handleServiceQueueChange,
  );

  /* =============================================================
     APPOINTMENT CHANGES

     IN_PROGRESS is an appointment status. Observing appointments
     ensures the work queue refreshes when an appointment enters or
     leaves IN_PROGRESS, even when no service_queue row is changed.
  ============================================================= */

  useRealtimeTable(
    'appointments',
    date
      ? `appointment_date=eq.${date}`
      : null,
    handleAppointmentChange,
  );
}
