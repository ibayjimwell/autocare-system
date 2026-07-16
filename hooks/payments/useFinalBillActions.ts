// hooks/payments/useFinalBillActions.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { finalBillsApi } from '@/lib/payments/final-bills';

export function useFinalBillActions(onSuccess: () => void) {
  const [cashierModalOpen, setCashierModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleOpenCashier = useCallback((bill: any) => {
    setSelectedBillForPayment(bill);
    setCashierModalOpen(true);
  }, []);

  const confirmDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (billType: 'estimates' | 'final-bills') => {
    if (!deleteTargetId) return;
    try {
      if (billType === 'estimates') {
        toast.info('Estimates cannot be deleted. You can decline them instead.');
      } else {
        const res = await finalBillsApi.delete(deleteTargetId);
        if (res.error) {
          toast.error(res.errorMessage || 'Failed to delete.');
        } else {
          toast.success('Final bill deleted.');
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, onSuccess]);

  return {
    cashierModalOpen,
    setCashierModalOpen,
    selectedBillForPayment,
    handleOpenCashier,
    deleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
    handleDelete,
  };
}