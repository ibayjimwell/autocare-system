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

  detailType:
    | 'estimate'
    | 'final-bill';

  refreshDetail: () => Promise<void>;

  reloadList: () => void;
}

type AdjustmentEditType =
  | 'fee'
  | 'discount';

interface DeleteTarget {
  type:
    | 'fee'
    | 'discount';

  id: string;

  title: string;
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
  ] =
    useState(false);

  const [
    feeForm,
    setFeeForm,
  ] =
    useState({
      title: '',
      amount: '',
    });

  /* ================================================================
     ADD DISCOUNT
  ================================================================ */

  const [
    discountModalOpen,
    setDiscountModalOpen,
  ] =
    useState(false);

  const [
    discountForm,
    setDiscountForm,
  ] =
    useState({
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
  ] =
    useState(false);

  /* ================================================================
     EDIT ADJUSTMENT
  ================================================================ */

  const [
    adjustmentEditOpen,
    setAdjustmentEditOpen,
  ] =
    useState(false);

  const [
    adjustmentEditType,
    setAdjustmentEditType,
  ] =
    useState<AdjustmentEditType>(
      'fee'
    );

  const [
    editingFee,
    setEditingFee,
  ] =
    useState<any>(
      null
    );

  const [
    editFeeForm,
    setEditFeeForm,
  ] =
    useState({
      title: '',
      amount: '',
    });

  const [
    editingDiscount,
    setEditingDiscount,
  ] =
    useState<any>(
      null
    );

  const [
    editDiscountForm,
    setEditDiscountForm,
  ] =
    useState({
      title: '',
      type: 'fixed',
      value: '',
    });

  /* ================================================================
     DELETE ADJUSTMENT
  ================================================================ */

  const [
    deleteAdjustmentOpen,
    setDeleteAdjustmentOpen,
  ] =
    useState(false);

  const [
    deleteAdjustmentTarget,
    setDeleteAdjustmentTarget,
  ] =
    useState<DeleteTarget | null>(
      null
    );

  /* ================================================================
     PENDING CHECK
  ================================================================ */

  const isEstimatePending =
    detailType ===
      'estimate' &&
    selectedItem?.status ===
      'PENDING';

  const ensurePendingEstimate =
    useCallback(
      () => {
        if (
          !isEstimatePending
        ) {
          toast.error(
            'Only pending estimates can be edited or modified.'
          );

          return false;
        }

        return true;
      },
      [
        isEstimatePending,
      ]
    );

  /* ================================================================
     OPEN ADD FEE
  ================================================================ */

  const openFeeModal =
    useCallback(
      () => {
        setFeeForm({
          title: '',
          amount: '',
        });

        setFeeModalOpen(
          true
        );
      },
      []
    );

  /* ================================================================
     OPEN ADD DISCOUNT
  ================================================================ */

  const openDiscountModal =
    useCallback(
      () => {
        if (
          detailType !==
          'estimate'
        ) {
          toast.error(
            'Discounts can only be added to estimates.'
          );

          return;
        }

        setDiscountForm({
          title: '',
          type: 'fixed',
          value: '',
        });

        setDiscountModalOpen(
          true
        );
      },
      [
        detailType,
      ]
    );

  /* ================================================================
     ADD FEE
  ================================================================ */

  const handleAddFee =
    useCallback(
      async () => {
        const title =
          feeForm.title.trim();

        const amount =
          parseFloat(
            feeForm.amount
          );

        if (
          !title ||
          !Number.isFinite(
            amount
          ) ||
          amount <= 0
        ) {
          toast.error(
            'Please enter a title and a valid amount.'
          );

          return;
        }

        if (
          !selectedItem?.id
        ) {
          toast.error(
            'No payment record is selected.'
          );

          return;
        }

        setSubmittingAdjustment(
          true
        );

        try {
          let res;

          if (
            detailType ===
            'estimate'
          ) {
            res =
              await estimateAdjustmentsApi.addFee(
                selectedItem.id,
                {
                  title,
                  amount,
                }
              );
          } else {
            res =
              await finalBillsApi.addFee(
                selectedItem.id,
                {
                  title,
                  amount,
                }
              );
          }

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to add fee.'
            );

            return;
          }

          toast.success(
            'Fee added.'
          );

          setFeeModalOpen(
            false
          );

          setFeeForm({
            title: '',
            amount: '',
          });

          /*
           * Immediately refresh the currently opened detail.
           *
           * Realtime separately synchronizes other open payment
           * screens.
           */
          await refreshDetail();

          await reloadList();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error adding fee.'
          );
        } finally {
          setSubmittingAdjustment(
            false
          );
        }
      },
      [
        feeForm,
        selectedItem,
        detailType,
        refreshDetail,
        reloadList,
      ]
    );

  /* ================================================================
     ADD DISCOUNT
  ================================================================ */

  const handleAddDiscount =
    useCallback(
      async () => {
        if (
          detailType !==
          'estimate'
        ) {
          toast.error(
            'Discounts can only be added to estimates.'
          );

          return;
        }

        const title =
          discountForm.title.trim();

        const value =
          parseFloat(
            discountForm.value
          );

        if (
          !title ||
          !Number.isFinite(
            value
          ) ||
          value <= 0
        ) {
          toast.error(
            'Please enter a title and a valid value.'
          );

          return;
        }

        if (
          discountForm.type ===
            'percentage' &&
          value > 100
        ) {
          toast.error(
            'Percentage discounts cannot exceed 100%.'
          );

          return;
        }

        if (
          !selectedItem?.id
        ) {
          toast.error(
            'No estimate is selected.'
          );

          return;
        }

        setSubmittingAdjustment(
          true
        );

        try {
          const res =
            await estimateAdjustmentsApi.addDiscount(
              selectedItem.id,
              {
                title,

                type:
                  discountForm.type as
                    | 'fixed'
                    | 'percentage',

                value,
              }
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to add discount.'
            );

            return;
          }

          toast.success(
            'Discount added.'
          );

          setDiscountModalOpen(
            false
          );

          setDiscountForm({
            title: '',
            type: 'fixed',
            value: '',
          });

          await refreshDetail();

          await reloadList();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error adding discount.'
          );
        } finally {
          setSubmittingAdjustment(
            false
          );
        }
      },
      [
        discountForm,
        detailType,
        selectedItem,
        refreshDetail,
        reloadList,
      ]
    );

  /* ================================================================
     OPEN EDIT FEE
  ================================================================ */

  const openEditFee =
    useCallback(
      (
        fee: any
      ) => {
        if (
          !ensurePendingEstimate()
        ) {
          return;
        }

        setEditingFee(
          fee
        );

        setAdjustmentEditType(
          'fee'
        );

        setEditFeeForm({
          title:
            String(
              fee?.title ||
                ''
            ),

          amount:
            Number(
              fee?.amount
            ).toFixed(2),
        });

        setAdjustmentEditOpen(
          true
        );
      },
      [
        ensurePendingEstimate,
      ]
    );

  /* ================================================================
     OPEN EDIT DISCOUNT
  ================================================================ */

  const openEditDiscount =
    useCallback(
      (
        discount: any
      ) => {
        if (
          !ensurePendingEstimate()
        ) {
          return;
        }

        setEditingDiscount(
          discount
        );

        setAdjustmentEditType(
          'discount'
        );

        setEditDiscountForm({
          title:
            String(
              discount?.title ||
                ''
            ),

          type:
            discount?.type ===
            'percentage'
              ? 'percentage'
              : 'fixed',

          value:
            String(
              discount?.value ??
                discount?.amount ??
                ''
            ),
        });

        setAdjustmentEditOpen(
          true
        );
      },
      [
        ensurePendingEstimate,
      ]
    );

  /* ================================================================
     SAVE EDITED FEE / DISCOUNT
  ================================================================ */

  const saveEditedAdjustment =
    useCallback(
      async () => {
        if (
          !ensurePendingEstimate()
        ) {
          return;
        }

        if (
          !selectedItem?.id
        ) {
          toast.error(
            'No estimate is selected.'
          );

          return;
        }

        setSubmittingAdjustment(
          true
        );

        try {
          if (
            adjustmentEditType ===
            'fee'
          ) {
            if (
              !editingFee?.id
            ) {
              return;
            }

            const title =
              editFeeForm.title.trim();

            const amount =
              parseFloat(
                editFeeForm.amount
              );

            if (
              !title ||
              !Number.isFinite(
                amount
              ) ||
              amount <= 0
            ) {
              toast.error(
                'Please enter a valid fee title and amount.'
              );

              return;
            }

            const res =
              await estimateAdjustmentsApi.updateFee(
                selectedItem.id,
                editingFee.id,
                {
                  title,
                  amount,
                }
              );

            if (
              res?.error
            ) {
              toast.error(
                res.errorMessage ||
                  'Failed to update fee.'
              );

              return;
            }

            toast.success(
              'Fee updated.'
            );
          } else {
            if (
              !editingDiscount?.id
            ) {
              return;
            }

            const title =
              editDiscountForm.title.trim();

            const value =
              parseFloat(
                editDiscountForm.value
              );

            if (
              !title ||
              !Number.isFinite(
                value
              ) ||
              value <= 0
            ) {
              toast.error(
                'Please enter a valid discount title and value.'
              );

              return;
            }

            if (
              editDiscountForm.type ===
                'percentage' &&
              value > 100
            ) {
              toast.error(
                'Percentage discounts cannot exceed 100%.'
              );

              return;
            }

            const res =
              await estimateAdjustmentsApi.updateDiscount(
                selectedItem.id,
                editingDiscount.id,
                {
                  title,

                  type:
                    editDiscountForm.type as
                      | 'fixed'
                      | 'percentage',

                  value,
                }
              );

            if (
              res?.error
            ) {
              toast.error(
                res.errorMessage ||
                  'Failed to update discount.'
              );

              return;
            }

            toast.success(
              'Discount updated.'
            );
          }

          setAdjustmentEditOpen(
            false
          );

          setEditingFee(
            null
          );

          setEditingDiscount(
            null
          );

          await refreshDetail();

          await reloadList();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error updating adjustment.'
          );
        } finally {
          setSubmittingAdjustment(
            false
          );
        }
      },
      [
        ensurePendingEstimate,
        selectedItem,
        adjustmentEditType,
        editingFee,
        editingDiscount,
        editFeeForm,
        editDiscountForm,
        refreshDetail,
        reloadList,
      ]
    );

  /* ================================================================
     REQUEST DELETE FEE
  ================================================================ */

  const requestDeleteFee =
    useCallback(
      (
        fee: any
      ) => {
        if (
          !ensurePendingEstimate()
        ) {
          return;
        }

        if (
          !fee?.id
        ) {
          return;
        }

        setDeleteAdjustmentTarget({
          type:
            'fee',

          id:
            fee.id,

          title:
            String(
              fee?.title ||
                'Fee'
            ),
        });

        setDeleteAdjustmentOpen(
          true
        );
      },
      [
        ensurePendingEstimate,
      ]
    );

  /* ================================================================
     REQUEST DELETE DISCOUNT
  ================================================================ */

  const requestDeleteDiscount =
    useCallback(
      (
        discount: any
      ) => {
        if (
          !ensurePendingEstimate()
        ) {
          return;
        }

        if (
          !discount?.id
        ) {
          return;
        }

        setDeleteAdjustmentTarget({
          type:
            'discount',

          id:
            discount.id,

          title:
            String(
              discount?.title ||
                'Discount'
            ),
        });

        setDeleteAdjustmentOpen(
          true
        );
      },
      [
        ensurePendingEstimate,
      ]
    );

  /* ================================================================
     CONFIRM DELETE
  ================================================================ */

  const confirmDeleteAdjustment =
    useCallback(
      async () => {
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

        setSubmittingAdjustment(
          true
        );

        try {
          let res;

          if (
            deleteAdjustmentTarget.type ===
            'fee'
          ) {
            res =
              await estimateAdjustmentsApi.deleteFee(
                selectedItem.id,
                deleteAdjustmentTarget.id
              );
          } else {
            res =
              await estimateAdjustmentsApi.deleteDiscount(
                selectedItem.id,
                deleteAdjustmentTarget.id
              );
          }

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                `Failed to remove ${deleteAdjustmentTarget.type}.`
            );

            return;
          }

          toast.success(
            `${
              deleteAdjustmentTarget.type ===
              'fee'
                ? 'Fee'
                : 'Discount'
            } removed.`
          );

          setDeleteAdjustmentOpen(
            false
          );

          setDeleteAdjustmentTarget(
            null
          );

          await refreshDetail();

          await reloadList();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error removing adjustment.'
          );
        } finally {
          setSubmittingAdjustment(
            false
          );
        }
      },
      [
        ensurePendingEstimate,
        selectedItem,
        deleteAdjustmentTarget,
        refreshDetail,
        reloadList,
      ]
    );

  /* ================================================================
     FINAL BILL PART EDIT
  ================================================================ */

  const [
    editPartModalOpen,
    setEditPartModalOpen,
  ] =
    useState(false);

  const [
    editingPart,
    setEditingPart,
  ] =
    useState<any>(
      null
    );

  const [
    editingFindingId,
    setEditingFindingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    editingBillId,
    setEditingBillId,
  ] =
    useState<string | null>(
      null
    );

  const [
    editPartForm,
    setEditPartForm,
  ] =
    useState({
      quantity: 1,
      priceAtTime: 0,
    });

  /* ================================================================
     OPEN FINAL BILL PART EDIT
  ================================================================ */

  const handleEditPartOpen =
    useCallback(
      (
        part: any,
        findingId: string,
        billId: string
      ) => {
        setEditingPart(
          part
        );

        setEditingFindingId(
          findingId
        );

        setEditingBillId(
          billId
        );

        setEditPartForm({
          quantity:
            Number(
              part?.quantity
            ) || 1,

          priceAtTime:
            Number(
              part?.priceAtTime
            ) || 0,
        });

        setEditPartModalOpen(
          true
        );
      },
      []
    );

  /* ================================================================
     SAVE FINAL BILL PART
  ================================================================ */

  const handleEditPartSave =
    useCallback(
      async () => {
        if (
          !editingPart ||
          !editingFindingId ||
          !editingBillId
        ) {
          return;
        }

        setSubmittingAdjustment(
          true
        );

        try {
          const res =
            await finalBillsApi.updatePart(
              editingBillId,
              editingFindingId,
              editingPart.id,
              editPartForm
            );

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to update part.'
            );

            return;
          }

          toast.success(
            'Part updated.'
          );

          setEditPartModalOpen(
            false
          );

          await refreshDetail();

          await reloadList();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Error updating part.'
          );
        } finally {
          setSubmittingAdjustment(
            false
          );
        }
      },
      [
        editingPart,
        editingFindingId,
        editingBillId,
        editPartForm,
        refreshDetail,
        reloadList,
      ]
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

    /* Pending Edit */
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

    /* Pending Delete */
    deleteAdjustmentOpen,

    setDeleteAdjustmentOpen,

    deleteAdjustmentTarget,

    requestDeleteFee,

    requestDeleteDiscount,

    confirmDeleteAdjustment,

    /* Final Bill Part */
    editPartModalOpen,

    setEditPartModalOpen,

    editingPart,

    editingFindingId,

    editingBillId,

    editPartForm,

    setEditPartForm,

    handleEditPartOpen,

    handleEditPartSave,

    /* State */
    submittingAdjustment,

    isEstimatePending,
  };
}