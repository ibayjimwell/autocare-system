'use client';

import { useState, useEffect, useCallback } from 'react';
import { staffApi } from '@/lib/staffs/staffs';
import { accessApi } from '@/lib/staffs/access';
import { useRealtimeStaffMonitor } from '@/connections/useRealtimeStaffMonitor';
import { MODULES } from '@/app-utils/staffs/constants';
import { toast } from 'sonner';

export function useStaffData() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const staffRes = await staffApi.list();
      if (staffRes.error) {
        toast.error(staffRes.errorMessage || 'Failed to load staff');
        setStaffList([]);
        return;
      }

      const accessRes = await accessApi.listAll();
      const accessMap: Record<string, number> = {};
      if (!accessRes.error && accessRes.data) {
        accessRes.data.forEach((rec: any) => {
          const count = MODULES.filter(mod => rec[mod] === true).length;
          accessMap[rec.staffId] = count;
        });
      }

      const staffWithCount = (staffRes.data || []).map((staff: any) => ({
        ...staff,
        accessCount: accessMap[staff.id] || 0,
      }));

      setStaffList(staffWithCount);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Realtime subscription
  useRealtimeStaffMonitor({ onDataChanged: loadStaff });

  return { staffList, loading, loadStaff };
}