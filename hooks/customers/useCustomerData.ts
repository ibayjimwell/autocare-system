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

  const loadCustomers =
    useCallback(async () => {
      setLoading(true);
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

          setCustomers([]);
        } else {
          setCustomers(
            res.data || []
          );
        }
      } catch (err: any) {
        setApiError({
          type: 'se',
          title:
            'Unexpected Error',
          message:
            err?.message ||
            'Something went wrong.',
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  /*
   * Force a lightweight rerender periodically so a customer whose
   * heartbeat becomes stale changes from Online to Offline without
   * waiting for another database event.
   */
  useEffect(() => {
    const interval =
      setInterval(() => {
        setPresenceNow(
          Date.now()
        );
      }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleRealtimeChange =
    useCallback(
      (
        payload: RealtimePostgresChangesPayload<any>
      ) => {
        setPresenceNow(
          Date.now()
        );

        setCustomers(
          (currentCustomers) => {
            switch (
              payload.eventType
            ) {
              case 'INSERT': {
                const inserted =
                  payload.new;

                if (
                  !inserted?.id
                ) {
                  return currentCustomers;
                }

                const alreadyExists =
                  currentCustomers.some(
                    (customer) =>
                      customer.id ===
                      inserted.id
                  );

                if (
                  alreadyExists
                ) {
                  return currentCustomers;
                }

                return [
                  ...currentCustomers,
                  inserted,
                ];
              }

              case 'UPDATE': {
                const updated =
                  payload.new;

                if (
                  !updated?.id
                ) {
                  return currentCustomers;
                }

                return currentCustomers.map(
                  (customer) =>
                    customer.id ===
                    updated.id
                      ? {
                          ...customer,
                          ...updated,
                        }
                      : customer
                );
              }

              case 'DELETE': {
                const deleted =
                  payload.old;

                if (
                  !deleted?.id
                ) {
                  return currentCustomers;
                }

                return currentCustomers.filter(
                  (customer) =>
                    customer.id !==
                    deleted.id
                );
              }

              default:
                return currentCustomers;
            }
          }
        );
      },
      []
    );

  useRealtimeCustomerMonitor({
    onDataChanged:
      handleRealtimeChange,
  });

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

      await loadCustomers();
    };

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

      await loadCustomers();
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