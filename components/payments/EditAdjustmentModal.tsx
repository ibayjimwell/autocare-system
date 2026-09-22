'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Button,
} from '@/components/ui/button';

export type AdjustmentEditType =
  | 'fee'
  | 'discount';

interface EditAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AdjustmentEditType;
  feeForm: {
    title: string;
    amount: string;
  };
  setFeeForm: (
    form: {
      title: string;
      amount: string;
    },
  ) => void;
  discountForm: {
    title: string;
    type: string;
    value: string;
  };
  setDiscountForm: (
    form: {
      title: string;
      type: string;
      value: string;
    },
  ) => void;
  onSave: () => void;
  saving?: boolean;
}

const inputClassName = `
  h-10
  w-full
  rounded-md
  border
  border-input
  bg-background
  px-3
  text-sm
  text-foreground
  outline-none
  transition
  placeholder:text-muted-foreground
  focus-visible:ring-2
  focus-visible:ring-ring
`;

export default function EditAdjustmentModal({
  open,
  onOpenChange,
  type,
  feeForm,
  setFeeForm,
  discountForm,
  setDiscountForm,
  onSave,
  saving = false,
}: EditAdjustmentModalProps) {
  const isFee = type === 'fee';

  return (
    <Dialog
      open={open}
      onOpenChange={
        saving
          ? undefined
          : onOpenChange
      }
    >
      <DialogContent className="w-[calc(100%-1rem)] max-w-md rounded-xl border border-border bg-card p-0 shadow-2xl sm:w-[calc(100%-2rem)]">
        <DialogHeader className="border-b border-border bg-background/80 p-5 backdrop-blur-xl">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Edit {isFee ? 'Fee' : 'Discount'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label
              htmlFor="adjustment-title"
              className="text-sm font-medium text-foreground"
            >
              Title
            </label>

            <input
              id="adjustment-title"
              type="text"
              value={
                isFee
                  ? feeForm.title
                  : discountForm.title
              }
              onChange={event => {
                if (isFee) {
                  setFeeForm({
                    ...feeForm,
                    title: event.target.value,
                  });
                } else {
                  setDiscountForm({
                    ...discountForm,
                    title: event.target.value,
                  });
                }
              }}
              className={inputClassName}
              disabled={saving}
              placeholder={
                isFee
                  ? 'Fee title'
                  : 'Discount title'
              }
            />
          </div>

          {isFee ? (
            <div className="space-y-2">
              <label
                htmlFor="adjustment-amount"
                className="text-sm font-medium text-foreground"
              >
                Amount
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  ₱
                </span>

                <input
                  id="adjustment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={feeForm.amount}
                  onChange={event =>
                    setFeeForm({
                      ...feeForm,
                      amount: event.target.value,
                    })
                  }
                  className={`${inputClassName} pl-8`}
                  disabled={saving}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="adjustment-type"
                  className="text-sm font-medium text-foreground"
                >
                  Discount Type
                </label>

                <select
                  id="adjustment-type"
                  value={discountForm.type}
                  onChange={event =>
                    setDiscountForm({
                      ...discountForm,
                      type: event.target.value,
                    })
                  }
                  className={inputClassName}
                  disabled={saving}
                >
                  <option value="fixed">
                    Fixed amount
                  </option>
                  <option value="percentage">
                    Percentage
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="adjustment-value"
                  className="text-sm font-medium text-foreground"
                >
                  Value
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    {discountForm.type === 'percentage'
                      ? '%'
                      : '₱'}
                  </span>

                  <input
                    id="adjustment-value"
                    type="number"
                    min="0.01"
                    max={
                      discountForm.type ===
                      'percentage'
                        ? '100'
                        : undefined
                    }
                    step="0.01"
                    value={discountForm.value}
                    onChange={event =>
                      setDiscountForm({
                        ...discountForm,
                        value: event.target.value,
                      })
                    }
                    className={`${inputClassName} pl-8`}
                    disabled={saving}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-background/80 p-4 backdrop-blur-xl">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="h-10 rounded-md"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
