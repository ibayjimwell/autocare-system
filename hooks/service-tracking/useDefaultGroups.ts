'use client';

import { useState, useEffect, useCallback } from 'react';
import { defaultGroupsApi } from '@/lib/service-tracking/default-groups';
import { toast } from 'sonner';

export function useDefaultGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await defaultGroupsApi.list();
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load default groups.');
        setGroups([]);
      } else {
        setGroups(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading default groups.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return { groups, loading, loadGroups };
}