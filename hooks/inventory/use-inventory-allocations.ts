'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  inventoryTrackingApi,
} from '@/lib/inventory/inventory-tracking';

import {
  useRealtimeInventoryTracking,
} from '@/connections/useRealtimeInventoryTracking';

export function useInventoryAllocations() {
  const [
    keepItems,
    setKeepItems,
  ] = useState<any[]>([]);

  const [
    usedItems,
    setUsedItems,
  ] = useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const loadAllocations =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const [
            keepRes,
            usedRes,
          ] =
            await Promise.all([
              inventoryTrackingApi.list({
                status:
                  'KEEP',
                page: 1,
                limit: 500,
              }),
              inventoryTrackingApi.list({
                status:
                  'USED',
                page: 1,
                limit: 500,
              }),
            ]);

          if (
            keepRes?.error ||
            usedRes?.error
          ) {
            throw new Error(
              keepRes?.errorMessage ||
                usedRes?.errorMessage ||
                'Unable to load inventory usage.',
            );
          }

          setKeepItems(
            Array.isArray(
              keepRes?.data,
            )
              ? keepRes.data
              : [],
          );

          setUsedItems(
            Array.isArray(
              usedRes?.data,
            )
              ? usedRes.data
              : [],
          );
        } catch (
          err: any
        ) {
          console.error(
            '[useInventoryAllocations] Load error:',
            err,
          );

          setError(
            err?.message ||
              'Unable to load inventory usage.',
          );

          setKeepItems([]);
          setUsedItems([]);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadAllocations();
  }, [
    loadAllocations,
  ]);

  const handleRealtimeChange =
    useCallback(() => {
      void loadAllocations();
    }, [
      loadAllocations,
    ]);

  useRealtimeInventoryTracking(
    handleRealtimeChange,
  );

  return {
    keepItems,
    usedItems,
    loading,
    error,
    loadAllocations,
  };
}
