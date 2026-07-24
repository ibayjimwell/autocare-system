// hooks/queue/useServiceQueue.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { serviceQueueApi } from '@/lib/queue/service-queue';
import { toast } from 'sonner';
import { useRealtimeServiceQueue } from '@/connections/useRealtimeServiceQueue';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function useServiceQueue(enabled: boolean = true) {
  const date = todayString();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    if (!enabled) return;
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

  // Fetch once when enabled changes or on mount
  useEffect(() => {
    if (enabled) {
      loadQueue();
    } else {
      setLoading(false);
      setQueue([]);
    }
  }, [enabled, loadQueue]);

  // Realtime subscription – only for today's date and only when enabled
  useRealtimeServiceQueue({
    onDataChanged: enabled ? loadQueue : () => {},
    date,
  });

  const reorder = async (appointmentId: string, newPosition: number) => {
    const res = await serviceQueueApi.reorder(appointmentId, newPosition);
    if (res.error) {
      toast.error(res.errorMessage || 'Failed to reorder.');
    } else {
      toast.success('Queue updated.');
      // No need to call loadQueue() – realtime will trigger it
    }
  };

  const moveUp = (appointmentId: string, currentPosition: number) => {
    if (currentPosition <= 1) return;
    reorder(appointmentId, currentPosition - 1);
  };

  const moveDown = (appointmentId: string, currentPosition: number, maxPosition: number) => {
    if (currentPosition >= maxPosition) return;
    reorder(appointmentId, currentPosition + 1);
  };

  return { queue, loading, moveUp, moveDown, reorder, loadQueue };
}