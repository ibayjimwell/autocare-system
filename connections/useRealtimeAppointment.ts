'use client';

import {
  useCallback,
} from 'react';

import {
  useRealtimeTable,
} from './useRealtimeTable';

import type {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

interface UseRealtimeAppointmentProps {
  onDataChanged: () => void;
}

/* ================================================================
   APPOINTMENT REALTIME

   Appointment lifecycle/date/time changes can affect queue membership
   and queue ordering.
================================================================ */

export function useRealtimeAppointment({
  onDataChanged,
}: UseRealtimeAppointmentProps) {
  const handleChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '📅 Appointment change detected, refreshing...',
          payload.eventType,
        );

        onDataChanged();
      },
      [onDataChanged],
    );

  useRealtimeTable(
    'appointments',
    undefined,
    handleChange,
  );
}
