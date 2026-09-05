// hooks/useStaffStatusMonitor.ts
'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimeTable } from '@/connections/useRealtimeTable';
import { useAuth } from '@/hooks/use-auth';

export function useStaffStatusMonitor() {
  const { data: session } = useSession();
  const { logout } = useAuth();
  const staffId = session?.user?.id;

  const handleChange = useCallback(
    (payload: any) => {
      // Only react to UPDATE events
      if (payload.eventType === 'UPDATE') {
        const newRecord = payload.new;
        // If the staff is now outboarded (in_boarding = false), log them out
        if (newRecord.in_boarding === false) {
          console.warn(`Staff ${staffId} has been outboarded – logging out immediately.`);
          logout();
        }
      }
    },
    [staffId, logout]
  );

  // Subscribe to real‑time changes on the staffs table for this specific staff
  // Only subscribe if we have a staffId
  useRealtimeTable('staffs', staffId ? `id=eq.${staffId}` : undefined, handleChange);
}