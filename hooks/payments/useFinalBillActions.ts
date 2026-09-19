'use client';

import {
  useCallback,
  useState,
} from 'react';

import { toast } from 'sonner';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

export function useFinalBillActions(
  onSuccess:
    () => void | Promise<void>,
) {
  const [
    cashierModalOpen,
    setCashierModalOpen,
  ] = useState(false);

  const [
    selectedBillForPayment,
    setSelectedBillForPayment,
  ] = useState<any>(null);

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    deleteTargetId,
    setDeleteTargetId,
  ] = useState<
    string | null
  >(null);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const handleOpenCashier =
    useCallback(
      (bill: any) => {
        setSelectedBillForPayment(
          bill,
        );

        setCashierModalOpen(
          true,
        );
      },
      [],
    );

  const confirmDelete =
    useCallback(
      (id: string) => {
        setDeleteTargetId(id);
        setDeleteDialogOpen(
          true,
        );
      },
      [],
    );

  const handleDelete =
    useCallback(
      async (
        billType:
          | 'estimates'
          | 'final-bills',
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
              'Estimates cannot be deleted. You can decline them instead.',
            );

            return;
          }

          const res =
            await finalBillsApi.delete(
              deleteTargetId,
            );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                'Failed to delete.',
            );

            return;
          }

          toast.success(
            'Final bill deleted.',
          );

          await onSuccess();
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ||
              'Error deleting final bill.',
          );
        } finally {
          setDeleteDialogOpen(
            false,
          );

          setDeleteTargetId(
            null,
          );
        }
      },
      [
        deleteTargetId,
        onSuccess,
      ],
    );

  const updateStatus =
    useCallback(
      async (
        billId: string,
        newStatus: string,
      ) => {
        if (!billId) {
          toast.error(
            'Missing final bill ID.',
          );

          return false;
        }

        setActionLoading(
          true,
        );

        try {
          const res =
            await finalBillsApi.updateStatus(
              billId,
              newStatus,
            );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                `Failed to update status to ${newStatus}.`,
            );

            return false;
          }

          toast.success(
            `Bill status updated to ${newStatus}.`,
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ||
              'Error updating bill status.',
          );

          return false;
        } finally {
          setActionLoading(
            false,
          );
        }
      },
      [onSuccess],
    );

  const parkVehicle =
    useCallback(
      async (
        billId: string,
        addParkingFee: boolean,
      ) => {
        if (!billId) {
          toast.error(
            'Missing final bill ID.',
          );

          return false;
        }

        setActionLoading(
          true,
        );

        try {
          const res =
            await finalBillsApi.park(
              billId,
              addParkingFee,
            );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                'Failed to park vehicle.',
            );

            return false;
          }

          toast.success(
            addParkingFee
              ? 'Vehicle parked. Parking fee is now accumulating.'
              : 'Vehicle parked without a parking fee.',
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ||
              'Error parking vehicle.',
          );

          return false;
        } finally {
          setActionLoading(
            false,
          );
        }
      },
      [onSuccess],
    );

  const stopParking =
    useCallback(
      async (
        billId: string,
      ) => {
        if (!billId) {
          toast.error(
            'Missing final bill ID.',
          );

          return false;
        }

        setActionLoading(
          true,
        );

        try {
          const res =
            await finalBillsApi.stopParking(
              billId,
            );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                'Failed to stop parking.',
            );

            return false;
          }

          const fee =
            Number(
              res?.data
                ?.parkingFee ||
                0,
            );

          const days =
            Number(
              res?.data
                ?.billableDays ||
                1,
            );

          toast.success(
            `Parking stopped. ₱${fee.toFixed(
              2,
            )} added for ${days} day${
              days === 1
                ? ''
                : 's'
            }.`,
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ||
              'Error stopping parking.',
          );

          return false;
        } finally {
          setActionLoading(
            false,
          );
        }
      },
      [onSuccess],
    );

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

    parkVehicle,
    stopParking,

    actionLoading,
  };
}