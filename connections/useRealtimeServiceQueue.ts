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

/* ================================================================
   TYPES
================================================================ */

type ServiceQueueRealtimeMode =
  | 'CONFIRMED'
  | 'IN_PROGRESS';

interface UseRealtimeServiceQueueProps {
  onDataChanged: () => void;
  date: string;
  mode?: ServiceQueueRealtimeMode;
}

/* ================================================================
   REALTIME SERVICE QUEUE
================================================================ */

export function useRealtimeServiceQueue({
  onDataChanged,
  date,
  mode = 'CONFIRMED',
}: UseRealtimeServiceQueueProps) {
  const handleQueueChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>,
      ) => {
        console.log(
          '📋 Service queue change detected, refreshing...',
          payload?.eventType,
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
          '📅 Appointment change detected for service queue, refreshing...',
          payload?.eventType,
        );

        onDataChanged();
      },
      [
        onDataChanged,
      ],
    );

  /* ==============================================================
     SERVICE QUEUE SUBSCRIPTION

     CONFIRMED:
       Keep the existing date-specific subscription.

     IN_PROGRESS:
       Subscribe to the entire service_queue table because an
       IN_PROGRESS job can belong to any appointment date.
  ============================================================== */

  useRealtimeTable(
    'service_queue',
    mode ===
      'IN_PROGRESS'
      ? undefined
      : date
        ? `queue_date=eq.${date}`
        : undefined,
    handleQueueChange,
  );

  /* ==============================================================
     APPOINTMENT SUBSCRIPTION

     IN_PROGRESS must also respond to appointment status changes.
     This covers legacy appointments that entered IN_PROGRESS without
     a service_queue row and ensures an older-date repair appears in
     the tab immediately after its status changes.

     CONFIRMED keeps the existing service_queue-focused behavior.
  ============================================================== */

  useRealtimeTable(
    'appointments',
    mode ===
      'IN_PROGRESS'
      ? undefined
      : 'id=eq.00000000-0000-0000-0000-000000000000',
    handleAppointmentChange,
  );
}