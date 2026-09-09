'use client';

import {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  customersApi,
} from '@/lib/customers/customers';

import {
  useRealtimeCustomerMonitor,
} from '@/connections/useRealtimeCustomerMonitor';

import {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

export type SortField =
  | 'fullname'
  | 'email'
  | 'phone'
  | 'createdAt'
  | 'updatedAt'
  | 'status';

export const CUSTOMER_ONLINE_TIMEOUT =
  75 * 1000;

export function isCustomerOnline(
  customer: any,
  now = Date.now()
) {
  if (!customer) {
    return false;
  }

  if (customer.deactivated) {
    return false;
  }

  if (customer.isOnline !== true) {
    return false;
  }

  if (!customer.lastSeenAt) {
    return customer.isOnline === true;
  }

  const lastSeen =
    new Date(
      customer.lastSeenAt
    ).getTime();

  if (Number.isNaN(lastSeen)) {
    return customer.isOnline === true;
  }

  return (
    now - lastSeen <=
    CUSTOMER_ONLINE_TIMEOUT
  );
}

export function getCustomerStatus(
  customer: any,
  now = Date.now()
) {
  if (customer?.deactivated) {
    return 'deactivated' as const;
  }

  if (
    isCustomerOnline(
      customer,
      now
    )
  ) {
    return 'online' as const;
  }

  return 'offline' as const;
}

export function useCustomerData() {
  const [customers, setCustomers] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [apiError, setApiError] =
    useState<any>(null);

  const [presenceNow, setPresenceNow] =
    useState(Date.now());

  /*
   * Fetch the complete customer collection.
   *
   * showLoading:
   * true  -> display the normal initial/loading state
   * false -> perform a silent realtime refresh
   */
  const loadCustomers =
    useCallback(
      async (
        showLoading = true
      ) => {
        if (showLoading) {
          setLoading(true);
        }

        setApiError(null);

        try {
          const res =
            await customersApi.list();

          if (res.error) {
            setApiError({
              type:
                res.errorType ||
                'fe',

              title:
                res.errorTitle ||
                'Error',

              message:
                res.errorMessage ||
                'Failed to load customers.',
            });

            /*
             * Only clear existing data for a normal explicit load.
             *
             * If a silent realtime refresh fails, keeping the previous
             * list is preferable to making the UI suddenly appear empty.
             */
            if (showLoading) {
              setCustomers([]);
            }

            return;
          }

          /*
           * Replace the entire customer array with the latest API
           * representation.
           *
           * This guarantees fields such as:
           *
           * - isPhoneVerified
           * - deactivated
           * - isOnline
           * - lastSeenAt
           * - createdAt
           * - updatedAt
           *
           * all use the same application-side naming/casing.
           */
          setCustomers(
            Array.isArray(
              res.data
            )
              ? res.data
              : []
          );

          /*
           * A successful sync means an old API error is no longer
           * relevant.
           */
          setApiError(null);
        } catch (err: any) {
          setApiError({
            type: 'se',
            title:
              'Unexpected Error',
            message:
              err?.message ||
              'Something went wrong.',
          });

          /*
           * During silent realtime synchronization we intentionally
           * preserve the existing visible data instead of replacing
           * it with an empty list.
           */
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      []
    );

  /*
   * Initial customer load.
   */
  useEffect(() => {
    void loadCustomers();
  }, [
    loadCustomers,
  ]);

  /*
   * Force a lightweight rerender periodically so a customer whose
   * heartbeat becomes stale changes from Online to Offline without
   * requiring another database event.
   */
  useEffect(() => {
    const interval =
      setInterval(() => {
        setPresenceNow(
          Date.now()
        );
      }, 15000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, []);

  /*
   * Realtime handler.
   *
   * Any database change causes a silent full synchronization.
   *
   * This is intentionally different from directly merging
   * payload.new because Supabase's raw Postgres payload can use
   * database column names while the application API uses the
   * transformed/camelCase representation.
   */
  const handleRealtimeChange =
    useCallback(
      (
        payload?: RealtimePostgresChangesPayload<any>
      ) => {
        console.log(
          '🔄 [Customer Module] Realtime synchronization triggered:',
          payload?.eventType
        );

        setPresenceNow(
          Date.now()
        );

        /*
         * Silent refresh:
         *
         * - no loading spinner
         * - no replacement with stale/partial realtime payload
         * - latest database state becomes the source of truth
         */
        void loadCustomers(
          false
        );
      },
      [
        loadCustomers,
      ]
    );

  useRealtimeCustomerMonitor({
    onDataChanged:
      handleRealtimeChange,
  });

  /*
   * Deactivate customer.
   *
   * The API operation itself remains unchanged.
   * The realtime event generated by the database will synchronize
   * all subscribed customer screens.
   *
   * We still explicitly refresh here so the initiating client does
   * not depend solely on realtime delivery.
   */
  const deactivateCustomer =
    async (
      id: string
    ) => {
      const res =
        await customersApi.deactivate(
          id
        );

      if (res.error) {
        throw new Error(
          res.errorMessage
        );
      }

      await loadCustomers(
        false
      );
    };

  /*
   * Reactivate customer.
   */
  const reactivateCustomer =
    async (
      id: string
    ) => {
      const res =
        await customersApi.reactivate(
          id
        );

      if (res.error) {
        throw new Error(
          res.errorMessage
        );
      }

      await loadCustomers(
        false
      );
    };

  return {
    customers,
    loading,
    apiError,

    loadCustomers,

    deactivateCustomer,
    reactivateCustomer,

    presenceNow,
  };
}