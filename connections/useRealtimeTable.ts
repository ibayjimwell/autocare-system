'use client';

import {
  useEffect,
  useRef,
} from 'react';

import { supabase } from '@/lib/supabase/client';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

type ChangeCallback = (
  payload: RealtimePostgresChangesPayload<any>
) => void;

export function useRealtimeTable(
  table: string,
  filter?: string,
  onChange?: ChangeCallback
) {
  const uniqueId = useRef(
    Math.random()
      .toString(36)
      .substring(2, 11)
  ).current;

  const onChangeRef =
    useRef<ChangeCallback | undefined>(
      onChange
    );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!table) {
      return;
    }

    const channelName =
      `${table}-${filter ?? 'all'}-${uniqueId}`;

    const channel =
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter
              ? { filter }
              : {}),
          },
          (payload) => {
            console.log(
              `🔄 [Realtime] ${table} change:`,
              payload.eventType
            );

            onChangeRef.current?.(
              payload
            );
          }
        )
        .subscribe((status) => {
          if (
            status === 'SUBSCRIBED'
          ) {
            console.log(
              `✅ Subscribed to ${table}`
            );
          } else if (
            status === 'CHANNEL_ERROR'
          ) {
            console.error(
              `❌ Subscription error on ${table}`
            );
          } else if (
            status === 'TIMED_OUT'
          ) {
            console.warn(
              `⏱️ Subscription timeout on ${table}`
            );
          }
        });

    return () => {
      console.log(
        `🔌 Unsubscribing from ${table}`
      );

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    table,
    filter,
    uniqueId,
  ]);
}