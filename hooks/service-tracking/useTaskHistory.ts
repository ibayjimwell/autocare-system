'use client';

import { useState, useEffect, useCallback } from 'react';
import { taskHistoryApi } from '@/lib/service-tracking/task-history';
import { toast } from 'sonner';

export function useTaskHistory(appointmentId?: string, phase?: string) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskHistoryApi.list({ appointmentId, phase });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load task history.');
        setHistory([]);
      } else {
        setHistory(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading task history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, phase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, loading, loadHistory };
}

// For the picker modal (all history with search)
export function useAllTaskHistory(search?: string, phase?: string) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskHistoryApi.list({ all: true, search, phase });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load task history.');
        setHistory([]);
      } else {
        setHistory(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading task history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [search, phase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { history, loading, loadHistory };
}