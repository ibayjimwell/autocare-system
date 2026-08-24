// hooks/queue/useServiceQueue.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { serviceQueueApi } from '@/lib/queue/service-queue';
import { toast } from 'sonner';
import { useRealtimeServiceQueue } from '@/connections/useRealtimeServiceQueue';

export function useServiceQueue(date: string, enabled: boolean = true) {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    if (!enabled || !date) return;
    try {
      const res = await serviceQueueApi.list(date);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load queue.');
        setQueue([]);
      } else {
        setQueue(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading queue.');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [date, enabled]);

  useEffect(() => {
    if (enabled && date) {
      loadQueue();
    } else {
      setLoading(false);
      setQueue([]);
    }
  }, [enabled, date, loadQueue]);

  // Realtime subscription – for the given date
  useRealtimeServiceQueue({
    onDataChanged: enabled && date ? loadQueue : () => {},
    date,
  });

  return { queue, loading, loadQueue };
}