'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  estimatesApi,
} from '@/lib/payments/estimates';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

import {
  useRealtimeTable,
} from '@/connections/useRealtimeTable';

import type {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

/* ================================================================
   HOOK
================================================================ */

export function useDetailModal(
  onSuccess?: () =>
    | void
    | Promise<void>
) {
  /* ==============================================================
     MODAL STATE
  ============================================================== */

  const [
    detailModalOpen,
    setDetailModalOpen,
  ] =
    useState(false);

  const [
    selectedItem,
    setSelectedItem,
  ] =
    useState<any>(
      null
    );

  const [
    detailType,
    setDetailType,
  ] =
    useState<
      | 'estimate'
      | 'final-bill'
    >(
      'estimate'
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  /* ==============================================================
     REALTIME DEBOUNCE
  ============================================================== */

  const realtimeTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /* ==============================================================
     REFRESH DETAIL
     
     A realtime event does not manually patch selectedItem.
     
     Instead, the hook retrieves the complete current record again.
     This keeps totals, findings, fees, discounts, parts, and related
     appointment information synchronized.
  ============================================================== */

  const refreshDetail =
    useCallback(
      async () => {
        if (
          !selectedItem
        ) {
          return;
        }

        try {
          /* ======================================================
             ESTIMATE
          ======================================================= */

          if (
            detailType ===
            'estimate'
          ) {
            const [
              estRes,
              apptRes,
            ] =
              await Promise.all([
                estimatesApi.get(
                  selectedItem.id
                ),

                appointmentsApi.get(
                  selectedItem.appointmentId
                ),
              ]);

            if (
              estRes.error ||
              !estRes.data
            ) {
              return;
            }

            const data =
              estRes.data;

            if (
              !apptRes.error &&
              apptRes.data
            ) {
              data.appointment =
                {
                  ...data.appointment,

                  ...apptRes.data,

                  services:
                    apptRes.data
                      .services ||
                    [],
                };
            }

            data.tasks =
              data.tasks ||
              [];

            data.findings =
              data.findings ||
              [];

            data.fees =
              data.fees ||
              [];

            data.discounts =
              data.discounts ||
              [];

            setSelectedItem(
              data
            );

            return;
          }

          /* ======================================================
             FINAL BILL
          ======================================================= */

          const [
            billRes,
            apptRes,
          ] =
            await Promise.all([
              finalBillsApi.get(
                selectedItem.id
              ),

              appointmentsApi.get(
                selectedItem.appointmentId
              ),
            ]);

          if (
            billRes.error ||
            !billRes.data
          ) {
            return;
          }

          const bill =
            billRes.data;

          if (
            !apptRes.error &&
            apptRes.data
          ) {
            bill.appointment =
              {
                ...bill.appointment,

                ...apptRes.data,

                services:
                  apptRes.data
                    .services ||
                  [],
              };
          }

          bill.findings =
            bill.findings ||
            [];

          bill.fees =
            bill.fees ||
            [];

          bill.discounts =
            bill.discounts ||
            [];

          bill.workTasks =
            bill.workTasks ||
            [];

          setSelectedItem(
            bill
          );
        } catch (
          err
        ) {
          console.error(
            'Failed to refresh payment detail:',
            err
          );
        }
      },
      [
        selectedItem,
        detailType,
      ]
    );

  /* ================================================================
     OPEN DETAIL
  ================================================================ */

  const openDetail =
    useCallback(
      async (
        item: any,
        type:
          | 'estimate'
          | 'final-bill'
      ) => {
        setDetailLoading(
          true
        );

        setSelectedItem(
          item
        );

        setDetailType(
          type
        );

        setDetailModalOpen(
          true
        );

        try {
          /* ======================================================
             FINAL BILL
          ======================================================= */

          if (
            type ===
            'final-bill'
          ) {
            const [
              billRes,
              apptRes,
            ] =
              await Promise.all([
                finalBillsApi.get(
                  item.id
                ),

                appointmentsApi.get(
                  item.appointmentId
                ),
              ]);

            if (
              billRes.error ||
              !billRes.data
            ) {
              toast.error(
                billRes.errorMessage ||
                  'Could not load full bill details.'
              );

              return;
            }

            const bill =
              billRes.data;

            if (
              !apptRes.error &&
              apptRes.data
            ) {
              bill.appointment =
                {
                  ...bill.appointment,

                  ...apptRes.data,

                  services:
                    apptRes.data
                      .services ||
                    [],
                };
            }

            bill.findings =
              bill.findings ||
              [];

            bill.fees =
              bill.fees ||
              [];

            bill.discounts =
              bill.discounts ||
              [];

            bill.workTasks =
              bill.workTasks ||
              [];

            setSelectedItem(
              bill
            );

            return;
          }

          /* ======================================================
             ESTIMATE
          ======================================================= */

          const [
            estRes,
            apptRes,
          ] =
            await Promise.all([
              estimatesApi.get(
                item.id
              ),

              appointmentsApi.get(
                item.appointmentId
              ),
            ]);

          if (
            estRes.error ||
            !estRes.data
          ) {
            toast.error(
              estRes.errorMessage ||
                'Could not load estimate details.'
            );

            return;
          }

          const data =
            estRes.data;

          if (
            !apptRes.error &&
            apptRes.data
          ) {
            data.appointment =
              {
                ...data.appointment,

                ...apptRes.data,

                services:
                  apptRes.data
                    .services ||
                  [],
              };
          }

          data.tasks =
            data.tasks ||
            [];

          data.findings =
            data.findings ||
            [];

          data.fees =
            data.fees ||
            [];

          data.discounts =
            data.discounts ||
            [];

          setSelectedItem(
            data
          );

          await onSuccess?.();
        } catch (
          err
        ) {
          console.error(
            'Failed to fetch payment details:',
            err
          );

          toast.error(
            'Error loading payment details.'
          );
        } finally {
          setDetailLoading(
            false
          );
        }
      },
      [
        onSuccess,
      ]
    );

  /* ================================================================
     SCHEDULE DETAIL REFRESH
     
     Multiple related payment records can change within the same
     short period. Debounce those events into one complete refresh.
  ================================================================ */

  const scheduleDetailRefresh =
    useCallback(
      (
        payload?: RealtimePostgresChangesPayload<any>
      ) => {
        console.log(
          '📡 Payment detail realtime change detected:',
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

              void refreshDetail();
            },
            120
          );
      },
      [
        refreshDetail,
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
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     ESTIMATE FEES
  ================================================================ */

  useRealtimeTable(
    'estimate_fees',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     ESTIMATE DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'estimate_discounts',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     ESTIMATE FINDINGS
  ================================================================ */

  useRealtimeTable(
    'estimate_findings',
    detailType ===
        'estimate' &&
      selectedItem?.id
      ? `estimate_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     ESTIMATE FINDING PARTS
     
     estimate_finding_parts only exposes estimate_finding_id.
     
     Because the supplied schema does not provide estimate_id
     directly on this table, use a global subscription while the
     currently opened estimate is being viewed.
     
     refreshDetail() then retrieves the authoritative estimate.
  ================================================================ */

  useRealtimeTable(
    'estimate_finding_parts',
    undefined,
    detailType ===
        'estimate'
      ? scheduleDetailRefresh
      : undefined
  );

  /* ================================================================
     FINAL BILL PARENT
  ================================================================ */

  useRealtimeTable(
    'final_bills',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     FINAL BILL FEES
  ================================================================ */

  useRealtimeTable(
    'final_bill_fees',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     FINAL BILL DISCOUNTS
  ================================================================ */

  useRealtimeTable(
    'final_bill_discounts',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     FINAL BILL FINDINGS
  ================================================================ */

  useRealtimeTable(
    'final_bill_findings',
    detailType ===
        'final-bill' &&
      selectedItem?.id
      ? `final_bill_id=eq.${selectedItem.id}`
      : undefined,
    scheduleDetailRefresh
  );

  /* ================================================================
     FINAL BILL FINDING PARTS
     
     final_bill_finding_parts only exposes final_bill_finding_id,
     so use a global subscription while a final bill is open.
  ================================================================ */

  useRealtimeTable(
    'final_bill_finding_parts',
    undefined,
    detailType ===
        'final-bill'
      ? scheduleDetailRefresh
      : undefined
  );

  /* ================================================================
     RETURN
  ================================================================ */

  return {
    detailModalOpen,

    setDetailModalOpen,

    selectedItem,

    setSelectedItem,

    detailType,

    detailLoading,

    openDetail,

    refreshDetail,
  };
}