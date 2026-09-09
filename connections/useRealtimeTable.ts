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
  /*
   * Keep a stable unique channel identifier so multiple instances
   * of the same realtime hook can exist without sharing channels.
   */
  const uniqueId = useRef(
    Math.random()
      .toString(36)
      .substring(2, 11)
  ).current;

  /*
   * Keep the latest callback without forcing the realtime
   * subscription to unsubscribe/re-subscribe whenever the callback
   * function changes.
   */
  const onChangeRef =
    useRef<
      ChangeCallback | undefined
    >(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!table) {
      return;
    }

    const channelName =
      `${table}-${filter ?? 'all'}-${uniqueId}`;

    console.log(
      `📡 [Realtime] Creating channel: ${channelName}`
    );

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
              ? {
                  filter,
                }
              : {}),
          },
          (
            payload
          ) => {
            console.log(
              `🔄 [Realtime] ${table} change detected:`,
              payload.eventType
            );

            /*
             * Do not mutate/interpret payload.new here.
             *
             * The consumer decides how to synchronize application
             * state. For the customer module, we intentionally
             * perform a fresh API read after a database change.
             */
            onChangeRef.current?.(
              payload
            );
          }
        )
        .subscribe(
          (status) => {
            switch (
              status
            ) {
              case 'SUBSCRIBED':
                console.log(
                  `✅ [Realtime] Subscribed to ${table}`
                );
                break;

              case 'CHANNEL_ERROR':
                console.error(
                  `❌ [Realtime] Channel error on ${table}`
                );
                break;

              case 'TIMED_OUT':
                console.warn(
                  `⏱️ [Realtime] Subscription timed out on ${table}`
                );
                break;

              case 'CLOSED':
                console.warn(
                  `🔒 [Realtime] Channel closed for ${table}`
                );
                break;

              default:
                console.log(
                  `ℹ️ [Realtime] ${table} status:`,
                  status
                );
            }
          }
        );

    return () => {
      console.log(
        `🔌 [Realtime] Removing channel: ${channelName}`
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