'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
import { toast } from 'sonner';

/* ================================================================
   DEFAULT TASK GROUPS HOOK
================================================================ */

export function useDefaultGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ==============================================================
     LOAD
  ============================================================== */

  const loadGroups = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await defaultGroupsApi.list();

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to load default task groups.',
          );

          setGroups([]);
          return [];
        }

        const nextGroups = Array.isArray(res?.data)
          ? res.data
          : [];

        setGroups(nextGroups);
        return nextGroups;
      } catch (err: any) {
        console.error(
          '[useDefaultGroups] Failed to load default groups:',
          err,
        );

        toast.error(
          err?.message ||
            'Error loading default task groups.',
        );

        setGroups([]);
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
    void loadGroups();
  }, [loadGroups]);

  return {
    groups,
    loading,
    refreshing,
    loadGroups,
  };
}
