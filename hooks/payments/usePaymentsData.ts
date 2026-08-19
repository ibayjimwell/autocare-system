'use client';

import { useState, useEffect, useCallback } from 'react';
import { estimatesApi } from '@/lib/payments/estimates';
import { finalBillsApi } from '@/lib/payments/final-bills';
import { useRealtimeTable } from '@/connections/useRealtimeTable';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Estimate {
  id: string;
  appointmentId: string;
  status: string;
  serviceSubtotal: string;
  findingsSubtotal: string;
  feesTotal: string;
  discountTotal: string;
  grandTotal: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  appointment?: any;
  findings?: any[];
  fees?: any[];
  discounts?: any[];
  tasks?: any[];
}

export interface FinalBill {
  id: string;
  appointmentId: string;
  estimateId?: string;
  status: string;
  serviceSubtotal: string;
  findingsSubtotal: string;
  workTasksSubtotal: string;
  feesTotal: string;
  discountTotal: string;
  grandTotal: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  appointment?: any;
  estimate?: any;
  findings?: any[];
  fees?: any[];
  discounts?: any[];
  workTasks?: any[];
}

export function usePaymentsData(statusFilter: string, search: string) {
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

  // Client-side search filtering
  const filteredEstimates = estimates.filter((est) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const customer = est.appointment?.customer?.fullname || '';
    const plate = est.appointment?.vehicle?.plateNumber || '';
    const tracking = est.appointment?.trackingNumber || '';
    return (
      customer.toLowerCase().includes(term) ||
      plate.toLowerCase().includes(term) ||
      tracking.toLowerCase().includes(term)
    );
  });

  const filteredFinalBills = finalBills.filter((bill) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const customer = bill.appointment?.customer?.fullname || '';
    const plate = bill.appointment?.vehicle?.plateNumber || '';
    const tracking = bill.appointment?.trackingNumber || '';
    return (
      customer.toLowerCase().includes(term) ||
      plate.toLowerCase().includes(term) ||
      tracking.toLowerCase().includes(term)
    );
  });

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real‑time subscriptions
  useRealtimeTable(
    'estimated_costs',
    undefined,
    useCallback((payload: RealtimePostgresChangesPayload<any>) => {
      console.log('📊 Estimate change detected, reloading payments data...');
      loadData();
    }, [loadData])
  );

  useRealtimeTable(
    'final_bills',
    undefined,
    useCallback((payload: RealtimePostgresChangesPayload<any>) => {
      console.log('🧾 Final bill change detected, reloading payments data...');
      loadData();
    }, [loadData])
  );

  return {
    estimates: filteredEstimates,
    finalBills: filteredFinalBills,
    loading,
    error,
    reload: loadData,
  };
}