'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from '@/connections/useRealtimeTable';

export type InventoryTrackingRealtimePayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: any;
  old?: any;
};

export function useRealtimeInventoryTracking(
  onChange?: (
    payload: InventoryTrackingRealtimePayload,
  ) => void,
) {
  const handleChange = useCallback(
    (payload: any) => {
      onChange?.(
        payload as InventoryTrackingRealtimePayload,
      );
    },
    [onChange],
  );

  useRealtimeTable(
    'inventory_allocations',
    undefined,
    handleChange,
  );
}
