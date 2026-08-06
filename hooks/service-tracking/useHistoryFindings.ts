'use client';

import { useState, useEffect, useCallback } from 'react';
import { historyFindingsApi } from '@/lib/service-tracking/history-findings';
import { toast } from 'sonner';

export function useHistoryFindings(search?: string, phase?: string) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await historyFindingsApi.list({ all: true, search, phase });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load history findings.');
        setFindings([]);
      } else {
        setFindings(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading history findings.');
      setFindings([]);
    } finally {
      setLoading(false);
    }
  }, [search, phase]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  return { findings, loading, loadFindings };
}