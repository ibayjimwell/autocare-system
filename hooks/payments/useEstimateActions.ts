'use client';

import {
  useCallback,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  estimatesApi,
} from '@/lib/payments/estimates';

/* ================================================================
   HOOK
================================================================ */

export function useEstimateActions(
  onSuccess: () =>
    | void
    | Promise<void>
) {
  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  /* ==============================================================
     SEND FOR APPROVAL
  ============================================================== */

  const handleSendForApproval =
    useCallback(
      async (
        estimateId: string
      ): Promise<boolean> => {
        if (
          !estimateId
        ) {
          toast.error(
            'Missing estimate ID.'
          );

          return false;
        }

        setActionLoading(
          true
        );

        try {
          const res =
            await estimatesApi.sendForApproval(
              estimateId
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to send for approval.'
            );

            return false;
          }

          toast.success(
            'Estimate sent for approval.'
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          console.error(
            '[useEstimateActions] Send for approval error:',
            error
          );

          toast.error(
            error?.message ||
              'Error sending estimate.'
          );

          return false;
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
     APPROVE
  ============================================================== */

  const handleApproveEstimate =
    useCallback(
      async (
        estimateId: string
      ): Promise<boolean> => {
        if (
          !estimateId
        ) {
          toast.error(
            'Missing estimate ID.'
          );

          return false;
        }

        setActionLoading(
          true
        );

        try {
          const res =
            await estimatesApi.approve(
              estimateId
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to approve estimate.'
            );

            return false;
          }

          toast.success(
            'Estimate approved. Work can begin.'
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          console.error(
            '[useEstimateActions] Approve error:',
            error
          );

          toast.error(
            error?.message ||
              'Error approving estimate.'
          );

          return false;
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
     DECLINE
  ============================================================== */

  const handleDeclineEstimate =
    useCallback(
      async (
        estimateId: string,
        reason: string
      ): Promise<boolean> => {
        const normalizedReason =
          (
            reason ||
            ''
          ).trim();

        if (
          !estimateId
        ) {
          toast.error(
            'Missing estimate ID.'
          );

          return false;
        }

        if (
          normalizedReason.length <
          3
        ) {
          toast.error(
            'Please provide a reason with at least 3 characters.'
          );

          return false;
        }

        setActionLoading(
          true
        );

        try {
          const res =
            await estimatesApi.decline(
              estimateId,
              normalizedReason
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to decline estimate.'
            );

            return false;
          }

          toast.success(
            'Estimate declined.'
          );

          await onSuccess();

          return true;
        } catch (
          error: any
        ) {
          console.error(
            '[useEstimateActions] Decline error:',
            error
          );

          toast.error(
            error?.message ||
              'Error declining estimate.'
          );

          return false;
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
    handleSendForApproval,

    handleApproveEstimate,

    handleDeclineEstimate,

    actionLoading,
  };
}