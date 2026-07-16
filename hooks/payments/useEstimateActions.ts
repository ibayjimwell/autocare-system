// hooks/payments/useEstimateActions.ts
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { estimatesApi } from '@/lib/payments/estimates';

export function useEstimateActions(onSuccess: () => void) {
  const handleSendForApproval = useCallback(async (estimateId: string) => {
    try {
      const res = await estimatesApi.sendForApproval(estimateId);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to send for approval.');
      } else {
        toast.success('Estimate sent for approval.');
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error.');
    }
  }, [onSuccess]);

  const handleApproveEstimate = useCallback(async (estimateId: string) => {
    try {
      const res = await estimatesApi.approve(estimateId);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to approve estimate.');
      } else {
        toast.success('Estimate approved. Work can begin.');
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error.');
    }
  }, [onSuccess]);

  const handleDeclineEstimate = useCallback(async (estimateId: string, reason: string) => {
    if (!reason) {
      toast.error('Please provide a reason for declining.');
      return;
    }
    try {
      const res = await estimatesApi.decline(estimateId, reason);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to decline estimate.');
      } else {
        toast.success('Estimate declined.');
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error.');
    }
  }, [onSuccess]);

  return { handleSendForApproval, handleApproveEstimate, handleDeclineEstimate };
}