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

  const reorder = useCallback(async (appointmentId: string, newPosition: number) => {
    const res = await serviceQueueApi.reorder(appointmentId, newPosition);
    if (res.error) {
      toast.error(res.errorMessage || 'Failed to reorder.');
    } else {
      toast.success('Queue updated.');
    }
  }, []);

  const moveUp = useCallback((appointmentId: string, currentPosition: number) => {
    if (currentPosition <= 1) return;
    reorder(appointmentId, currentPosition - 1);
  }, [reorder]);

  const moveDown = useCallback((appointmentId: string, currentPosition: number, maxPosition: number) => {
    if (currentPosition >= maxPosition) return;
    reorder(appointmentId, currentPosition + 1);
  }, [reorder]);

  return { queue, loading, loadQueue, moveUp, moveDown, reorder };
}