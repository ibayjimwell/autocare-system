// hooks/payments/usePaymentsData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { estimatesApi } from '@/lib/payments/estimates';
import { finalBillsApi } from '@/lib/payments/final-bills';

export interface Estimate { /* same as before */ }
export interface FinalBill { /* same as before */ }

export function usePaymentsData(statusFilter: string) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [finalBills, setFinalBills] = useState<FinalBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: string; title: string; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const [estRes, billRes] = await Promise.all([
        estimatesApi.list(filter),
        finalBillsApi.list(filter),
      ]);
      if (estRes.error) {
        setError({
          type: estRes.errorType || 'fe',
          title: estRes.errorTitle || 'Error',
          message: estRes.errorMessage || 'Failed to load estimates.',
        });
        setEstimates([]);
      } else {
        setEstimates(estRes.data || []);
      }
      if (billRes.error) {
        setError({
          type: billRes.errorType || 'fe',
          title: billRes.errorTitle || 'Error',
          message: billRes.errorMessage || 'Failed to load final bills.',
        });
        setFinalBills([]);
      } else {
        setFinalBills(billRes.data || []);
      }
    } catch (err: any) {
      setError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { estimates, finalBills, loading, error, reload: loadData };
}