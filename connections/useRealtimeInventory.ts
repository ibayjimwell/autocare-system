// connections/useRealtimeInventory.ts
'use client';
import { useRef, useEffect, useCallback } from 'react';
import { useRealtimeTable } from './useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtimeInventory(onDataChanged: () => void) {
  // Keep a ref to the latest callback so the subscription always calls the freshest one
  const callbackRef = useRef(onDataChanged);
  useEffect(() => {
    callbackRef.current = onDataChanged;
  }, [onDataChanged]);

  // Stable handler that never changes – avoids re‑subscribing
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📦 Inventory change detected, refreshing...');
      callbackRef.current();
    },
    []   // empty – stable forever
  );

  useRealtimeTable('inventory', undefined, handleChange);
}