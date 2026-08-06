'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';

export function useDefaultFindings() {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await defaultFindingsApi.list();
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load default findings.');
        setFindings([]);
      } else {
        setFindings(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading default findings.');
      setFindings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  return { findings, loading, loadFindings };
}