// hooks/payments/useAdjustments.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { estimateAdjustmentsApi } from '@/lib/payments/estimates';
import { finalBillsApi } from '@/lib/payments/final-bills';

interface AdjustmentProps {
  selectedItem: any;
  detailType: 'estimate' | 'final-bill';
  refreshDetail: () => Promise<void>;
  reloadList: () => void;
}

export function useAdjustments({ selectedItem, detailType, refreshDetail, reloadList }: AdjustmentProps) {
  // Fee
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({ title: '', amount: '', findingId: 'none' });
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Discount
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({ title: '', type: 'fixed', value: '' });

  // Part edit
  const [editPartModalOpen, setEditPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editPartForm, setEditPartForm] = useState({ quantity: 1, priceAtTime: 0 });

  const handleAddFee = useCallback(async () => {
    if (!feeForm.title.trim() || !feeForm.amount || parseFloat(feeForm.amount) <= 0) {
      toast.error('Please enter a title and a valid amount.');
      return;
    }
    setSubmittingAdjustment(true);
    try {
      const res = await estimateAdjustmentsApi.addFee(selectedItem.id, {
        title: feeForm.title.trim(),
        amount: parseFloat(feeForm.amount),
        findingId: feeForm.findingId === 'none' ? undefined : feeForm.findingId,
      });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to add fee.');
      } else {
        toast.success('Fee added.');
        setFeeModalOpen(false);
        setFeeForm({ title: '', amount: '', findingId: 'none' });
        await refreshDetail();
        reloadList();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding fee.');
    } finally {
      setSubmittingAdjustment(false);
    }
  }, [feeForm, selectedItem, refreshDetail, reloadList]);

  const handleAddDiscount = useCallback(async () => {
    if (!discountForm.title.trim() || !discountForm.value || parseFloat(discountForm.value) <= 0) {
      toast.error('Please enter a title and a valid value.');
      return;
    }
    setSubmittingAdjustment(true);
    try {
      const res = await estimateAdjustmentsApi.addDiscount(selectedItem.id, {
        title: discountForm.title.trim(),
        type: discountForm.type as 'fixed' | 'percentage',
        value: parseFloat(discountForm.value),
      });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to add discount.');
      } else {
        toast.success('Discount added.');
        setDiscountModalOpen(false);
        setDiscountForm({ title: '', type: 'fixed', value: '' });
        await refreshDetail();
        reloadList();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adding discount.');
    } finally {
      setSubmittingAdjustment(false);
    }
  }, [discountForm, selectedItem, refreshDetail, reloadList]);

  const handleEditPartOpen = useCallback((part: any, findingId: string, billId: string) => {
    setEditingPart(part);
    setEditingFindingId(findingId);
    setEditingBillId(billId);
    setEditPartForm({ quantity: part.quantity, priceAtTime: parseFloat(part.priceAtTime) });
    setEditPartModalOpen(true);
  }, []);

  const handleEditPartSave = useCallback(async () => {
    if (!editingPart || !editingFindingId || !editingBillId) return;
    setSubmittingAdjustment(true);
    try {
      const res = await finalBillsApi.updatePart(
        editingBillId,
        editingFindingId,
        editingPart.id,
        editPartForm
      );
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to update part.');
      } else {
        toast.success('Part updated.');
        setEditPartModalOpen(false);
        await refreshDetail();
        reloadList();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating part.');
    } finally {
      setSubmittingAdjustment(false);
    }
  }, [editingPart, editingFindingId, editingBillId, editPartForm, refreshDetail, reloadList]);

  return {
    feeModalOpen, setFeeModalOpen, feeForm, setFeeForm,
    discountModalOpen, setDiscountModalOpen, discountForm, setDiscountForm,
    editPartModalOpen, setEditPartModalOpen,
    editingPart, editingFindingId, editingBillId, editPartForm, setEditPartForm,
    submittingAdjustment,
    handleAddFee, handleAddDiscount, handleEditPartOpen, handleEditPartSave,
  };
}