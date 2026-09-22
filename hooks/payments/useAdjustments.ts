'use client';

import {
  useCallback,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  estimateAdjustmentsApi,
} from '@/lib/payments/estimates';

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

/* ================================================================
   TYPES
================================================================ */

interface AdjustmentProps {
  selectedItem: any;
  detailType: 'estimate' | 'final-bill';
  refreshDetail: () => Promise<void>;
  reloadList: () => void | Promise<void>;
}

type AdjustmentEditType =
  | 'fee'
  | 'discount';

type FinalCostChangeActionType =
  | 'fee'
  | 'discount'
  | 'part';

type FinalCostChangeOperation =
  | 'edit'
  | 'delete';

interface DeleteTarget {
  type: 'fee' | 'discount';
  id: string;
  title: string;
}

export interface FinalCostChangeTarget {
  operation: FinalCostChangeOperation;
  type: FinalCostChangeActionType;
  item: any;
  findingId?: string;
  billId?: string;
}

/* ================================================================
   HELPERS
================================================================ */

function isFinalCostEditable(
  item: any,
): boolean {
  const status = String(
    item?.status || '',
  )
    .trim()
    .toUpperCase();

  return (
    status === 'PENDING' ||
    status === 'PARKED'
  );
}

function extractName(
  target: FinalCostChangeTarget | null,
): string {
  if (!target) {
    return 'this item';
  }

  if (
    target.type === 'part'
  ) {
    return (
      String(
        target.item?.partName ||
          target.item?.name ||
          target.item?.productName ||
          'Part/item',
      ).trim() ||
      'Part/item'
    );
  }

  return (
    String(
      target.item?.title ||
        (target.type === 'fee'
          ? 'Fee'
          : 'Discount'),
    ).trim() ||
    'Item'
  );
}

/* ================================================================
   HOOK
================================================================ */

export function useAdjustments({
  selectedItem,
  detailType,
  refreshDetail,
  reloadList,
}: AdjustmentProps) {
  /* ================================================================
     ADD FEE
  ================================================================ */

  const [
    feeModalOpen,
    setFeeModalOpen,
  ] = useState(false);

  const [
    feeForm,
    setFeeForm,
  ] = useState({
    title: '',
    amount: '',
    findingId: 'none',
  });

  /* ================================================================
     ADD DISCOUNT
  ================================================================ */

  const [
    discountModalOpen,
    setDiscountModalOpen,
  ] = useState(false);

  const [
    discountForm,
    setDiscountForm,
  ] = useState({
    title: '',
    type: 'fixed',
    value: '',
  });

  /* ================================================================
     GENERAL SAVING
  ================================================================ */

  const [
    submittingAdjustment,
    setSubmittingAdjustment,
  ] = useState(false);

  /* ================================================================
     EDIT ADJUSTMENT
  ================================================================ */

  const [
    adjustmentEditOpen,
    setAdjustmentEditOpen,
  ] = useState(false);

  const [
    adjustmentEditType,
    setAdjustmentEditType,
  ] = useState<AdjustmentEditType>(
    'fee',
  );

  const [
    editingFee,
    setEditingFee,
  ] = useState<any>(null);

  const [
    editFeeForm,
    setEditFeeForm,
  ] = useState({
    title: '',
    amount: '',
  });

  const [
    editingDiscount,
    setEditingDiscount,
  ] = useState<any>(null);

  const [
    editDiscountForm,
    setEditDiscountForm,
  ] = useState({
    title: '',
    type: 'fixed',
    value: '',
  });

  /* ================================================================
     LEGACY ESTIMATE DELETE CONFIRMATION

     These are retained so existing estimate behavior remains
     compatible with the rest of the payment page.
  ================================================================ */

  const [
    deleteAdjustmentOpen,
    setDeleteAdjustmentOpen,
  ] = useState(false);

  const [
    deleteAdjustmentTarget,
    setDeleteAdjustmentTarget,
  ] = useState<DeleteTarget | null>(null);

  /* ================================================================
     FINAL COST CHANGE CONFIRMATION
  ================================================================ */

  const [
    finalCostChangeConfirmationOpen,
    setFinalCostChangeConfirmationOpen,
  ] = useState(false);

  const [
    finalCostChangeAction,
    setFinalCostChangeAction,
  ] = useState<FinalCostChangeTarget | null>(
    null,
  );

  /* ================================================================
     PENDING CHECKS
  ================================================================ */

  const isEstimatePending =
    detailType === 'estimate' &&
    selectedItem?.status === 'PENDING';

  const isFinalBillEditable =
    detailType === 'final-bill' &&
    isFinalCostEditable(selectedItem);

  const ensurePendingEstimate =
    useCallback(() => {
      if (!isEstimatePending) {
        toast.error(
          'Only pending estimates can be edited or modified.',
        );
        return false;
      }

      return true;
    }, [
      isEstimatePending,
    ]);

  const ensureEditableFinalCost =
    useCallback(() => {
      if (!isFinalBillEditable) {
        toast.error(
          'Only Pending or Parked Final Costs can be edited or modified.',
        );
        return false;
      }

      return true;
    }, [
      isFinalBillEditable,
    ]);

  /* ================================================================
     REFRESH AFTER CHANGE
  ================================================================ */

  const refreshAfterChange =
    useCallback(async () => {
      await refreshDetail();
      await reloadList();
    }, [
      refreshDetail,
      reloadList,
    ]);

  /* ================================================================
     OPEN ADD FEE
  ================================================================ */

  const openFeeModal =
    useCallback(() => {
      if (
        detailType === 'estimate' &&
        !ensurePendingEstimate()
      ) {
        return;
      }

      if (
        detailType === 'final-bill' &&
        !ensureEditableFinalCost()
      ) {
        return;
      }

      setFeeForm({
        title: '',
        amount: '',
        findingId: 'none',
      });

      setFeeModalOpen(true);
    }, [
      detailType,
      ensurePendingEstimate,
      ensureEditableFinalCost,
    ]);

  /* ================================================================
     OPEN ADD DISCOUNT
  ================================================================ */

  const openDiscountModal =
    useCallback(() => {
      if (
        detailType === 'estimate'
      ) {
        if (!ensurePendingEstimate()) {
          return;
        }
      } else if (
        !ensureEditableFinalCost()
      ) {
        return;
      }

      setDiscountForm({
        title: '',
        type: 'fixed',
        value: '',
      });

      setDiscountModalOpen(true);
    }, [
      detailType,
      ensurePendingEstimate,
      ensureEditableFinalCost,
    ]);

  /* ================================================================
     ADD FEE
  ================================================================ */

  const handleAddFee =
    useCallback(async () => {
      const title =
        feeForm.title.trim();

      const amount =
        parseFloat(
          feeForm.amount,
        );

      if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        toast.error(
          'Please enter a title and a valid amount.',
        );
        return;
      }

      if (!selectedItem?.id) {
        toast.error(
          'No payment record is selected.',
        );
        return;
      }

      if (
        detailType === 'estimate'
      ) {
        if (!ensurePendingEstimate()) {
          return;
        }
      } else if (
        !ensureEditableFinalCost()
      ) {
        return;
      }

      setSubmittingAdjustment(true);

      try {
        const findingId =
          feeForm.findingId ||
          'none';

        let res;

        if (
          detailType === 'estimate'
        ) {
          res =
            await estimateAdjustmentsApi.addFee(
              selectedItem.id,
              {
                title,
                amount,
                ...(findingId !== 'none'
                  ? { findingId }
                  : {}),
              },
            );
        } else {
          res =
            await finalBillsApi.addFee(
              selectedItem.id,
              {
                title,
                amount,
                ...(findingId !== 'none'
                  ? { findingId }
                  : {}),
              },
            );
        }

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to add fee.',
          );
          return;
        }

        toast.success(
          'Fee added.',
        );

        setFeeModalOpen(false);

        setFeeForm({
          title: '',
          amount: '',
          findingId: 'none',
        });

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error adding fee.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      feeForm,
      selectedItem,
      detailType,
      ensurePendingEstimate,
      ensureEditableFinalCost,
      refreshAfterChange,
    ]);

  /* ================================================================
     ADD DISCOUNT
  ================================================================ */

  const handleAddDiscount =
    useCallback(async () => {
      const title =
        discountForm.title.trim();

      const value =
        parseFloat(
          discountForm.value,
        );

      if (
        !title ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        toast.error(
          'Please enter a title and a valid value.',
        );
        return;
      }

      if (
        discountForm.type ===
          'percentage' &&
        value > 100
      ) {
        toast.error(
          'Percentage discounts cannot exceed 100%.',
        );
        return;
      }

      if (!selectedItem?.id) {
        toast.error(
          'No payment record is selected.',
        );
        return;
      }

      if (
        detailType === 'estimate'
      ) {
        if (!ensurePendingEstimate()) {
          return;
        }
      } else if (
        !ensureEditableFinalCost()
      ) {
        return;
      }

      setSubmittingAdjustment(true);

      try {
        let res;

        const payload = {
          title,
          type:
            discountForm.type as
              | 'fixed'
              | 'percentage',
          value,
        };

        if (
          detailType === 'estimate'
        ) {
          res =
            await estimateAdjustmentsApi.addDiscount(
              selectedItem.id,
              payload,
            );
        } else {
          res =
            await finalBillsApi.addDiscount(
              selectedItem.id,
              payload,
            );
        }

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to add discount.',
          );
          return;
        }

        toast.success(
          'Discount added.',
        );

        setDiscountModalOpen(false);

        setDiscountForm({
          title: '',
          type: 'fixed',
          value: '',
        });

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error adding discount.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      discountForm,
      detailType,
      selectedItem,
      ensurePendingEstimate,
      ensureEditableFinalCost,
      refreshAfterChange,
    ]);

  /* ================================================================
     REQUEST FINAL COST CHANGE

     The confirmation is deliberately shown before opening the actual
     edit/delete form. This ensures every edit and every deletion is
     explicitly acknowledged by the user.
  ================================================================ */

  const requestFinalCostChange =
    useCallback(
      (
        target: FinalCostChangeTarget,
      ) => {
        if (!ensureEditableFinalCost()) {
          return;
        }

        setFinalCostChangeAction(target);
        setFinalCostChangeConfirmationOpen(true);
      },
      [ensureEditableFinalCost],
    );

  /* ================================================================
     OPEN EDIT FEE
  ================================================================ */

  const openEditFee =
    useCallback(
      (fee: any) => {
        if (
          detailType === 'estimate'
        ) {
          if (!ensurePendingEstimate()) {
            return;
          }

          setEditingFee(fee);
          setAdjustmentEditType('fee');
          setEditFeeForm({
            title: String(
              fee?.title || '',
            ),
            amount: Number(
              fee?.amount,
            ).toFixed(2),
          });
          setAdjustmentEditOpen(true);
          return;
        }

        requestFinalCostChange({
          operation: 'edit',
          type: 'fee',
          item: fee,
          billId: selectedItem?.id,
        });
      },
      [
        detailType,
        ensurePendingEstimate,
        requestFinalCostChange,
        selectedItem?.id,
      ],
    );

  /* ================================================================
     OPEN EDIT DISCOUNT
  ================================================================ */

  const openEditDiscount =
    useCallback(
      (discount: any) => {
        if (
          detailType === 'estimate'
        ) {
          if (!ensurePendingEstimate()) {
            return;
          }

          setEditingDiscount(discount);
          setAdjustmentEditType('discount');
          setEditDiscountForm({
            title: String(
              discount?.title || '',
            ),
            type:
              discount?.type ===
              'percentage'
                ? 'percentage'
                : 'fixed',
            value: String(
              discount?.value ??
                discount?.amount ??
                '',
            ),
          });
          setAdjustmentEditOpen(true);
          return;
        }

        requestFinalCostChange({
          operation: 'edit',
          type: 'discount',
          item: discount,
          billId: selectedItem?.id,
        });
      },
      [
        detailType,
        ensurePendingEstimate,
        requestFinalCostChange,
        selectedItem?.id,
      ],
    );

  /* ================================================================
     SAVE EDITED FEE / DISCOUNT
  ================================================================ */

  const saveEditedAdjustment =
    useCallback(async () => {
      if (!selectedItem?.id) {
        toast.error(
          'No payment record is selected.',
        );
        return;
      }

      if (
        detailType === 'estimate'
      ) {
        if (!ensurePendingEstimate()) {
          return;
        }
      } else if (
        !ensureEditableFinalCost()
      ) {
        return;
      }

      setSubmittingAdjustment(true);

      try {
        if (
          adjustmentEditType === 'fee'
        ) {
          if (!editingFee?.id) {
            toast.error(
              'No fee is selected.',
            );
            return;
          }

          const title =
            editFeeForm.title.trim();

          const amount =
            parseFloat(
              editFeeForm.amount,
            );

          if (
            !title ||
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            toast.error(
              'Please enter a valid fee title and amount.',
            );
            return;
          }

          const res =
            detailType === 'estimate'
              ? await estimateAdjustmentsApi.updateFee(
                  selectedItem.id,
                  editingFee.id,
                  {
                    title,
                    amount,
                  },
                )
              : await finalBillsApi.updateFee(
                  selectedItem.id,
                  editingFee.id,
                  {
                    title,
                    amount,
                  },
                );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                'Failed to update fee.',
            );
            return;
          }

          toast.success(
            'Fee updated.',
          );
        } else {
          if (!editingDiscount?.id) {
            toast.error(
              'No discount is selected.',
            );
            return;
          }

          const title =
            editDiscountForm.title.trim();

          const value =
            parseFloat(
              editDiscountForm.value,
            );

          if (
            !title ||
            !Number.isFinite(value) ||
            value <= 0
          ) {
            toast.error(
              'Please enter a valid discount title and value.',
            );
            return;
          }

          if (
            editDiscountForm.type ===
              'percentage' &&
            value > 100
          ) {
            toast.error(
              'Percentage discounts cannot exceed 100%.',
            );
            return;
          }

          const payload = {
            title,
            type:
              editDiscountForm.type as
                | 'fixed'
                | 'percentage',
            value,
          };

          const res =
            detailType === 'estimate'
              ? await estimateAdjustmentsApi.updateDiscount(
                  selectedItem.id,
                  editingDiscount.id,
                  payload,
                )
              : await finalBillsApi.updateDiscount(
                  selectedItem.id,
                  editingDiscount.id,
                  payload,
                );

          if (res?.error) {
            toast.error(
              res.errorMessage ||
                'Failed to update discount.',
            );
            return;
          }

          toast.success(
            'Discount updated.',
          );
        }

        setAdjustmentEditOpen(false);
        setEditingFee(null);
        setEditingDiscount(null);

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error updating adjustment.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      selectedItem?.id,
      detailType,
      ensurePendingEstimate,
      ensureEditableFinalCost,
      adjustmentEditType,
      editingFee,
      editingDiscount,
      editFeeForm,
      editDiscountForm,
      refreshAfterChange,
    ]);

  /* ================================================================
     REQUEST DELETE FEE
  ================================================================ */

  const requestDeleteFee =
    useCallback(
      (fee: any) => {
        if (!fee?.id) {
          return;
        }

        if (
          detailType === 'estimate'
        ) {
          if (!ensurePendingEstimate()) {
            return;
          }

          setDeleteAdjustmentTarget({
            type: 'fee',
            id: fee.id,
            title: String(
              fee?.title || 'Fee',
            ),
          });
          setDeleteAdjustmentOpen(true);
          return;
        }

        requestFinalCostChange({
          operation: 'delete',
          type: 'fee',
          item: fee,
          billId: selectedItem?.id,
        });
      },
      [
        detailType,
        ensurePendingEstimate,
        requestFinalCostChange,
        selectedItem?.id,
      ],
    );

  /* ================================================================
     REQUEST DELETE DISCOUNT
  ================================================================ */

  const requestDeleteDiscount =
    useCallback(
      (discount: any) => {
        if (!discount?.id) {
          return;
        }

        if (
          detailType === 'estimate'
        ) {
          if (!ensurePendingEstimate()) {
            return;
          }

          setDeleteAdjustmentTarget({
            type: 'discount',
            id: discount.id,
            title: String(
              discount?.title ||
                'Discount',
            ),
          });
          setDeleteAdjustmentOpen(true);
          return;
        }

        requestFinalCostChange({
          operation: 'delete',
          type: 'discount',
          item: discount,
          billId: selectedItem?.id,
        });
      },
      [
        detailType,
        ensurePendingEstimate,
        requestFinalCostChange,
        selectedItem?.id,
      ],
    );

  /* ================================================================
     CONFIRM LEGACY ESTIMATE DELETE
  ================================================================ */

  const confirmDeleteAdjustment =
    useCallback(async () => {
      if (
        !ensurePendingEstimate()
      ) {
        return;
      }

      if (
        !selectedItem?.id ||
        !deleteAdjustmentTarget
      ) {
        return;
      }

      setSubmittingAdjustment(true);

      try {
        const res =
          deleteAdjustmentTarget.type ===
          'fee'
            ? await estimateAdjustmentsApi.deleteFee(
                selectedItem.id,
                deleteAdjustmentTarget.id,
              )
            : await estimateAdjustmentsApi.deleteDiscount(
                selectedItem.id,
                deleteAdjustmentTarget.id,
              );

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to remove adjustment.',
          );
          return;
        }

        toast.success(
          `${
            deleteAdjustmentTarget.type ===
            'fee'
              ? 'Fee'
              : 'Discount'
          } removed.`,
        );

        setDeleteAdjustmentOpen(false);
        setDeleteAdjustmentTarget(null);

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error removing adjustment.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      ensurePendingEstimate,
      selectedItem?.id,
      deleteAdjustmentTarget,
      refreshAfterChange,
    ]);

  /* ================================================================
     FINAL COST PART EDIT / DELETE STATE
  ================================================================ */

  const [
    editPartModalOpen,
    setEditPartModalOpen,
  ] = useState(false);

  const [
    editingPart,
    setEditingPart,
  ] = useState<any>(null);

  const [
    editingFindingId,
    setEditingFindingId,
  ] = useState<string | null>(null);

  const [
    editingBillId,
    setEditingBillId,
  ] = useState<string | null>(null);

  const [
    editPartForm,
    setEditPartForm,
  ] = useState({
    quantity: 1,
    priceAtTime: 0,
  });

  /* ================================================================
     OPEN FINAL COST PART EDIT
  ================================================================ */

  const handleEditPartOpen =
    useCallback(
      (
        part: any,
        findingId: string,
        billId: string,
      ) => {
        requestFinalCostChange({
          operation: 'edit',
          type: 'part',
          item: part,
          findingId,
          billId,
        });
      },
      [requestFinalCostChange],
    );

  /* ================================================================
     REQUEST FINAL COST PART DELETE
  ================================================================ */

  const handleDeletePart =
    useCallback(
      (
        part: any,
        findingId: string,
        billId: string,
      ) => {
        requestFinalCostChange({
          operation: 'delete',
          type: 'part',
          item: part,
          findingId,
          billId,
        });
      },
      [requestFinalCostChange],
    );

  /* ================================================================
     CONFIRM FINAL COST CHANGE
  ================================================================ */

  const confirmFinalCostChange =
    useCallback(async () => {
      const target =
        finalCostChangeAction;

      if (!target) {
        return;
      }

      if (!ensureEditableFinalCost()) {
        setFinalCostChangeConfirmationOpen(false);
        setFinalCostChangeAction(null);
        return;
      }

      if (
        target.operation === 'edit'
      ) {
        if (
          target.type === 'fee'
        ) {
          setEditingFee(target.item);
          setAdjustmentEditType('fee');
          setEditFeeForm({
            title: String(
              target.item?.title || '',
            ),
            amount: Number(
              target.item?.amount,
            ).toFixed(2),
          });
          setFinalCostChangeConfirmationOpen(false);
          setAdjustmentEditOpen(true);
        } else if (
          target.type === 'discount'
        ) {
          setEditingDiscount(target.item);
          setAdjustmentEditType('discount');
          setEditDiscountForm({
            title: String(
              target.item?.title || '',
            ),
            type:
              target.item?.type ===
              'percentage'
                ? 'percentage'
                : 'fixed',
            value: String(
              target.item?.value ??
                target.item?.amount ??
                '',
            ),
          });
          setFinalCostChangeConfirmationOpen(false);
          setAdjustmentEditOpen(true);
        } else {
          setEditingPart(target.item);
          setEditingFindingId(
            target.findingId ?? null,
          );
          setEditingBillId(
            target.billId ??
              selectedItem?.id ??
              null,
          );
          setEditPartForm({
            quantity:
              Math.max(
                1,
                Number(
                  target.item?.quantity,
                ) || 1,
              ),
            priceAtTime:
              Math.max(
                0,
                Number(
                  target.item?.priceAtTime,
                ) || 0,
              ),
          });
          setFinalCostChangeConfirmationOpen(false);
          setEditPartModalOpen(true);
        }

        setFinalCostChangeAction(null);
        return;
      }

      setSubmittingAdjustment(true);

      try {
        let res;

        if (
          target.type === 'fee'
        ) {
          if (
            !target.billId ||
            !target.item?.id
          ) {
            toast.error(
              'Fee information is incomplete.',
            );
            return;
          }

          res =
            await finalBillsApi.deleteFee(
              target.billId,
              target.item.id,
            );
        } else if (
          target.type === 'discount'
        ) {
          if (
            !target.billId ||
            !target.item?.id
          ) {
            toast.error(
              'Discount information is incomplete.',
            );
            return;
          }

          res =
            await finalBillsApi.deleteDiscount(
              target.billId,
              target.item.id,
            );
        } else {
          if (
            !target.billId ||
            !target.findingId ||
            !target.item?.id
          ) {
            toast.error(
              'Part information is incomplete.',
            );
            return;
          }

          res =
            await finalBillsApi.deletePart(
              target.billId,
              target.findingId,
              target.item.id,
            );
        }

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to remove the Final Cost item.',
          );
          return;
        }

        toast.success(
          `${
            target.type === 'fee'
              ? 'Fee'
              : target.type === 'discount'
                ? 'Discount'
                : 'Part/item'
          } removed from Final Cost.`,
        );

        setFinalCostChangeConfirmationOpen(false);
        setFinalCostChangeAction(null);

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error removing the Final Cost item.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      finalCostChangeAction,
      ensureEditableFinalCost,
      selectedItem?.id,
      refreshAfterChange,
    ]);

  /* ================================================================
     SAVE FINAL COST PART
  ================================================================ */

  const handleEditPartSave =
    useCallback(async () => {
      if (
        !editingPart ||
        !editingFindingId ||
        !editingBillId
      ) {
        return;
      }

      if (!ensureEditableFinalCost()) {
        return;
      }

      const quantity =
        Number(editPartForm.quantity);

      const priceAtTime =
        Number(editPartForm.priceAtTime);

      if (
        !Number.isFinite(quantity) ||
        quantity < 1
      ) {
        toast.error(
          'Quantity must be at least 1.',
        );
        return;
      }

      if (
        !Number.isFinite(priceAtTime) ||
        priceAtTime < 0
      ) {
        toast.error(
          'Part price must be zero or greater.',
        );
        return;
      }

      setSubmittingAdjustment(true);

      try {
        const res =
          await finalBillsApi.updatePart(
            editingBillId,
            editingFindingId,
            editingPart.id,
            {
              quantity,
              priceAtTime,
            },
          );

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to update part.',
          );
          return;
        }

        toast.success(
          'Part/item updated.',
        );

        setEditPartModalOpen(false);
        setEditingPart(null);
        setEditingFindingId(null);
        setEditingBillId(null);

        await refreshAfterChange();
      } catch (err: any) {
        toast.error(
          err?.message ||
            'Error updating part.',
        );
      } finally {
        setSubmittingAdjustment(false);
      }
    }, [
      editingPart,
      editingFindingId,
      editingBillId,
      editPartForm,
      ensureEditableFinalCost,
      refreshAfterChange,
    ]);

  /* ================================================================
     CLOSE FINAL COST EDIT CONFIRMATION
  ================================================================ */

  const closeFinalCostChangeConfirmation =
    useCallback(
      (open: boolean) => {
        if (submittingAdjustment) {
          return;
        }

        setFinalCostChangeConfirmationOpen(
          open,
        );

        if (!open) {
          setFinalCostChangeAction(null);
        }
      },
      [submittingAdjustment],
    );

  /* ================================================================
     RETURN
  ================================================================ */

  return {
    /* Add Fee */
    feeModalOpen,
    setFeeModalOpen,
    openFeeModal,
    feeForm,
    setFeeForm,
    handleAddFee,

    /* Add Discount */
    discountModalOpen,
    setDiscountModalOpen,
    openDiscountModal,
    discountForm,
    setDiscountForm,
    handleAddDiscount,

    /* Estimate Edit */
    adjustmentEditOpen,
    setAdjustmentEditOpen,
    adjustmentEditType,
    editingFee,
    editFeeForm,
    setEditFeeForm,
    editingDiscount,
    editDiscountForm,
    setEditDiscountForm,
    openEditFee,
    openEditDiscount,
    saveEditedAdjustment,

    /* Estimate Delete */
    deleteAdjustmentOpen,
    setDeleteAdjustmentOpen,
    deleteAdjustmentTarget,
    requestDeleteFee,
    requestDeleteDiscount,
    confirmDeleteAdjustment,

    /* Final Cost Change Confirmation */
    finalCostChangeConfirmationOpen,
    setFinalCostChangeConfirmationOpen:
      closeFinalCostChangeConfirmation,
    finalCostChangeAction,
    confirmFinalCostChange,
    finalCostChangeTargetName:
      extractName(
        finalCostChangeAction,
      ),

    /* Final Cost Part */
    editPartModalOpen,
    setEditPartModalOpen,
    editingPart,
    editingFindingId,
    editingBillId,
    editPartForm,
    setEditPartForm,
    handleEditPartOpen,
    handleDeletePart,
    handleEditPartSave,

    /* State */
    submittingAdjustment,
    isEstimatePending,
    isFinalBillEditable,
  };
}
