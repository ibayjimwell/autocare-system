'use client';

import { useCallback } from 'react';
import { useRealtimeTable } from '@/connections/useRealtimeTable';

export type InventoryRealtimePayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: any;
  old?: any;
};

export function useRealtimeInventory(
  onChange?: (payload: InventoryRealtimePayload) => void,
) {
  const handleChange = useCallback(
    (payload: any) => {
      onChange?.(payload as InventoryRealtimePayload);
    },
    [onChange],
  );

  useRealtimeTable(
    'inventory',
    undefined,
    handleChange,
  );
}
