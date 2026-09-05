// hooks/useStaffAccessMonitor.ts
'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimeTable } from '@/connections/useRealtimeTable';

export function useStaffAccessMonitor() {
  const { data: session, update } = useSession();
  const staffId = session?.user?.id;

  const handleChange = useCallback(
    async (payload: any) => {
      // React to UPDATE and INSERT events
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        console.log('🔔 Staff access changed, refreshing session...');
        // Refresh the session to get the latest access permissions
        await update();
      }
    },
    [update]
  );

  // Subscribe to real‑time changes on the staff_access table for this staff
  useRealtimeTable('staff_access', staffId ? `staff_id=eq.${staffId}` : undefined, handleChange);
}