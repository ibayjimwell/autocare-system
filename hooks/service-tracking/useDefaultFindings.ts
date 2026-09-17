'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';

/* ================================================================
   DEFAULT FINDINGS HOOK
================================================================ */

export function useDefaultFindings() {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ==============================================================
     LOAD
  ============================================================== */

  const loadFindings = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await defaultFindingsApi.list();

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to load default findings.',
          );

          setFindings([]);
          return [];
        }

        const nextFindings = Array.isArray(res?.data)
          ? res.data
          : [];

        setFindings(nextFindings);
        return nextFindings;
      } catch (err: any) {
        console.error(
          '[useDefaultFindings] Failed to load default findings:',
          err,
        );

        toast.error(
          err?.message ||
            'Error loading default findings.',
        );

        setFindings([]);
        return [];
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  /* ==============================================================
     INITIAL LOAD
  ============================================================== */

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  return {
    findings,
    loading,
    refreshing,
    loadFindings,
  };
}
