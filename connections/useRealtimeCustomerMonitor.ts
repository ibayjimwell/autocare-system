'use client';

import { useCallback } from 'react';

import {
  useRealtimeTable,
} from './useRealtimeTable';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

interface UseRealtimeCustomerMonitorProps {
  onDataChanged: (
    payload?: RealtimePostgresChangesPayload<any>
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
          '👤 [Realtime] Customer change detected:',
          payload.eventType
        );

        /*
         * Important:
         *
         * We intentionally do not pass payload.new into customer
         * state. The payload is from the raw Supabase/Postgres
         * representation.
         *
         * The customer data hook will perform a fresh API read,
         * guaranteeing that the UI receives the exact same object
         * shape as the normal customer GET request.
         */
        onDataChanged(
          payload
        );
      },
      [
        onDataChanged,
      ]
    );

  /*
   * Subscribe to every change on the customers table.
   *
   * No row-level filter is used because this module needs to react
   * to INSERT, UPDATE and DELETE for every customer.
   */
  useRealtimeTable(
    'customers',
    undefined,
    handleChange
  );
}