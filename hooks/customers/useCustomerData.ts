// hooks/customers/useCustomerData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { customersApi } from '@/lib/customers/customers';

export type SortField =
  | 'fullname' | 'email' | 'phone'
  | 'createdAt' | 'updatedAt' | 'status';

export function useCustomerData() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<any>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await customersApi.list();
      if (res.error) {
        setApiError({
          type: res.errorType || 'fe',
          title: res.errorTitle || 'Error',
          message: res.errorMessage || 'Failed to load customers.',
        });
        setCustomers([]);
      } else {
        setCustomers(res.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, []);

  const deactivateCustomer = async (id: string) => {
    const res = await customersApi.deactivate(id);
    if (res.error) throw new Error(res.errorMessage);
    await loadCustomers();
  };

  const reactivateCustomer = async (id: string) => {
    const res = await customersApi.reactivate(id);
    if (res.error) throw new Error(res.errorMessage);
    await loadCustomers();
  };

  return {
    customers,
    loading,
    apiError,
    loadCustomers,
    deactivateCustomer,
    reactivateCustomer,
  };
}