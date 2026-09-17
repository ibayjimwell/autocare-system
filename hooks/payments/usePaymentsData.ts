'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  estimatesApi,
} from '@/lib/payments/estimates';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  useRealtimeTable,
} from '@/connections/useRealtimeTable';

import type {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

/* ================================================================
   TYPES
================================================================ */

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

/* ================================================================
   HOOK
================================================================ */

export function usePaymentsData(
  statusFilter: string,
  search: string
) {
  /* ==============================================================
     STATE
  ============================================================== */

  const [
    estimates,
    setEstimates,
  ] = useState<Estimate[]>(
    []
  );

  const [
    finalBills,
    setFinalBills,
  ] = useState<FinalBill[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    error,
    setError,
  ] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(
    null
  );

  /* ==============================================================
     REALTIME DEBOUNCE TIMER
  ============================================================== */

  const realtimeTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /* ==============================================================
     LOAD DATA
     
     The API remains the source of truth.
     
     Every realtime database event causes a fresh API read instead
     of manually mutating the existing state from payload.new or
     payload.old.
  ============================================================== */

  const loadData =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const filter =
            statusFilter &&
            statusFilter !==
              'ALL'
              ? {
                  status:
                    statusFilter,
                }
              : {};

          const [
            estRes,
            billRes,
          ] =
            await Promise.all([
              estimatesApi.list(
                filter
              ),

              finalBillsApi.list(
                filter
              ),
            ]);

          /* ======================================================
             ESTIMATES
          ======================================================= */

          if (
            estRes.error
          ) {
            setError({
              type:
                estRes.errorType ||
                'fe',

              title:
                estRes.errorTitle ||
                'Error',

              message:
                estRes.errorMessage ||
                'Failed to load estimates.',
            });

            setEstimates(
              []
            );
          } else {
            setEstimates(
              estRes.data ||
                []
            );
          }

          /* ======================================================
             FINAL BILLS
          ======================================================= */

          if (
            billRes.error
          ) {
            setError({
              type:
                billRes.errorType ||
                'fe',

              title:
                billRes.errorTitle ||
                'Error',

              message:
                billRes.errorMessage ||
                'Failed to load final bills.',
            });

            setFinalBills(
              []
            );
          } else {
            setFinalBills(
              billRes.data ||
                []
            );
          }
        } catch (
          err: any
        ) {
          setError({
            type:
              'se',

            title:
              'Unexpected Error',

            message:
              err?.message ||
              'Something went wrong.',
          });
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        statusFilter,
      ]
    );

  /* ================================================================
     CLIENT SEARCH
  ================================================================ */

  const filteredEstimates =
    estimates.filter(
      (
        est
      ) => {
        if (
          !search.trim()
        ) {
          return true;
        }

        const term =
          search
            .trim()
            .toLowerCase();

        const customer =
          est.appointment
            ?.customer
            ?.fullname ||
          '';

        const plate =
          est.appointment
            ?.vehicle
            ?.plateNumber ||
          '';

        const tracking =
          est.appointment
            ?.trackingNumber ||
          '';

        return (
          customer
            .toLowerCase()
            .includes(
              term
            ) ||
          plate
            .toLowerCase()
            .includes(
              term
            ) ||
          tracking
            .toLowerCase()
            .includes(
              term
            )
        );
      }
    );

  const filteredFinalBills =
    finalBills.filter(
      (
        bill
      ) => {
        if (
          !search.trim()
        ) {
          return true;
        }

        const term =
          search
            .trim()
            .toLowerCase();

        const customer =
          bill.appointment
            ?.customer
            ?.fullname ||
          '';

        const plate =
          bill.appointment
            ?.vehicle
            ?.plateNumber ||
          '';

        const tracking =
          bill.appointment
            ?.trackingNumber ||
          '';

        return (
          customer
            .toLowerCase()
            .includes(
              term
            ) ||
          plate
            .toLowerCase()
            .includes(
              term
            ) ||
          tracking
            .toLowerCase()
            .includes(
              term
            )
        );
      }
    );

  /* ================================================================
     INITIAL LOAD
  ================================================================ */

  useEffect(() => {
    void loadData();
  }, [
    loadData,
  ]);

  /* ================================================================
     REALTIME RELOAD
     
     Several related tables can change at nearly the same time.
     Debouncing collapses those events into one fresh API request.
  ================================================================ */

  const scheduleRealtimeReload =
    useCallback(
      (
        payload?: RealtimePostgresChangesPayload<any>
      ) => {
        console.log(
          '📡 Payment realtime change detected:',
          payload?.eventType ||
            'unknown'
        );

        if (
          realtimeTimerRef.current
        ) {
          clearTimeout(
            realtimeTimerRef.current
          );
        }

        realtimeTimerRef.current =
          setTimeout(
            () => {
              realtimeTimerRef.current =
                null;

              void loadData();
            },
            120
          );
      },
      [
        loadData,
      ]
    );

  /* ================================================================
     REALTIME TIMER CLEANUP
  ================================================================ */

  useEffect(() => {
    return () => {
      if (
        realtimeTimerRef.current
      ) {
        clearTimeout(
          realtimeTimerRef.current
        );

        realtimeTimerRef.current =
          null;
      }
    };
  }, []);

  /* ================================================================
     ESTIMATE PARENT
  ================================================================ */

  useRealtimeTable(
    'estimated_costs',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     ESTIMATE FEES
  ================================================================ */

  useRealtimeTable(
    'estimate_fees',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     ESTIMATE DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'estimate_discounts',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     ESTIMATE FINDINGS
  ================================================================ */

  useRealtimeTable(
    'estimate_findings',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     ESTIMATE FINDING PARTS
  ================================================================ */

  useRealtimeTable(
    'estimate_finding_parts',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     FINAL BILL PARENT
  ================================================================ */

  useRealtimeTable(
    'final_bills',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     FINAL BILL FEES
  ================================================================ */

  useRealtimeTable(
    'final_bill_fees',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     FINAL BILL DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'final_bill_discounts',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     FINAL BILL FINDINGS
  ================================================================ */

  useRealtimeTable(
    'final_bill_findings',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     FINAL BILL FINDING PARTS
  ================================================================ */

  useRealtimeTable(
    'final_bill_finding_parts',
    undefined,
    scheduleRealtimeReload
  );

  /* ================================================================
     RETURN
  ================================================================ */

  return {
    estimates:
      filteredEstimates,

    finalBills:
      filteredFinalBills,

    loading,

    error,

    reload:
      loadData,
  };
}