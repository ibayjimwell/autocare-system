// connections/useRealtimeTable.ts
'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ChangeCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

export function useRealtimeTable(
  table: string,
  filter?: string,
  onChange?: ChangeCallback
) {
  // Generate a unique ID for this subscription instance
  const uniqueId = useRef(Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    const channelName = `${table}-${filter ?? 'all'}-${uniqueId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          console.log(`🔄 Realtime event on ${table}:`, payload.eventType);
          onChange?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Failed to subscribe to ${table}`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ Subscription to ${table} timed out`);
        }
      });

    return () => {
      console.log(`🔌 Unsubscribing from ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table, filter, uniqueId]);   // onChange intentionally left out – stable via parent
}