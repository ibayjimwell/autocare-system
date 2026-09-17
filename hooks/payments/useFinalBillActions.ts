'use client';

import {
  useCallback,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

/* ================================================================
   HOOK
================================================================ */

export function useFinalBillActions(
  onSuccess: () =>
    | void
    | Promise<void>
) {
  /* ==============================================================
     CASHIER
  ============================================================== */

  const [
    cashierModalOpen,
    setCashierModalOpen,
  ] =
    useState(false);

  const [
    selectedBillForPayment,
    setSelectedBillForPayment,
  ] =
    useState<any>(
      null
    );

  /* ==============================================================
     DELETE
  ============================================================== */

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(false);

  const [
    deleteTargetId,
    setDeleteTargetId,
  ] =
    useState<string | null>(
      null
    );

  /* ==============================================================
     ACTION LOADING
  ============================================================== */

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  /* ==============================================================
     OPEN CASHIER
  ============================================================== */

  const handleOpenCashier =
    useCallback(
      (
        bill: any
      ) => {
        setSelectedBillForPayment(
          bill
        );

        setCashierModalOpen(
          true
        );
      },
      []
    );

  /* ==============================================================
     REQUEST DELETE
  ============================================================== */

  const confirmDelete =
    useCallback(
      (
        id: string
      ) => {
        setDeleteTargetId(
          id
        );

        setDeleteDialogOpen(
          true
        );
      },
      []
    );

  /* ==============================================================
     DELETE
  ============================================================== */

  const handleDelete =
    useCallback(
      async (
        billType:
          | 'estimates'
          | 'final-bills'
      ) => {
        if (
          !deleteTargetId
        ) {
          return;
        }

        try {
          if (
            billType ===
            'estimates'
          ) {
            toast.info(
              'Estimates cannot be deleted. You can decline them instead.'
            );
          } else {
            const res =
              await finalBillsApi.delete(
                deleteTargetId
              );

            if (
              res.error
            ) {
              toast.error(
                res.errorMessage ||
                  'Failed to delete.'
              );
            } else {
              toast.success(
                'Final bill deleted.'
              );

              /*
               * Refresh the current page immediately.
               *
               * Other open clients receive the same change through
               * final_bills realtime subscription.
               */
              await onSuccess();
            }
          }
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error.'
          );
        } finally {
          setDeleteDialogOpen(
            false
          );

          setDeleteTargetId(
            null
          );
        }
      },
      [
        deleteTargetId,
        onSuccess,
      ]
    );

  /* ==============================================================
     UPDATE STATUS
     
     Examples:
       PENDING
       HOLD
       OFFICIAL
     
     The database UPDATE is detected by the final_bills realtime
     subscription in usePaymentsData and useDetailModal.
  ============================================================== */

  const updateStatus =
    useCallback(
      async (
        billId: string,
        newStatus: string,
        parkingFeeRate?: number,
        parkingFeeUnit?: string
      ) => {
        if (
          !billId
        ) {
          toast.error(
            'Missing final bill ID.'
          );

          return;
        }

        setActionLoading(
          true
        );

        try {
          const res =
            await finalBillsApi.updateStatus(
              billId,
              newStatus,
              parkingFeeRate,
              parkingFeeUnit
            );

          if (
            res.error
          ) {
            toast.error(
              res.errorMessage ||
                `Failed to update status to ${newStatus}.`
            );
          } else {
            toast.success(
              `Bill status updated to ${newStatus}.`
            );

            await onSuccess();
          }
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error updating status.'
          );
        } finally {
          setActionLoading(
            false
          );
        }
      },
      [
        onSuccess,
      ]
    );

  /* ==============================================================
     RETURN
  ============================================================== */

  return {
    cashierModalOpen,

    setCashierModalOpen,

    selectedBillForPayment,

    handleOpenCashier,

    deleteDialogOpen,

    setDeleteDialogOpen,

    confirmDelete,

    handleDelete,

    updateStatus,

    actionLoading,
  };
}