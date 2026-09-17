'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Pencil,
  Percent,
  Wrench,
} from 'lucide-react';

type AdjustmentEditType =
  | 'fee'
  | 'discount';

interface EditAdjustmentModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  type: AdjustmentEditType;

  feeForm: {
    title: string;
    amount: string;
  };

  setFeeForm: (
    form: {
      title: string;
      amount: string;
    }
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
    }
  ) => void;

  onSave: () => void;

  saving: boolean;
}

export default function EditAdjustmentModal({
  open,
  onOpenChange,
  type,
  feeForm,
  setFeeForm,
  discountForm,
  setDiscountForm,
  onSave,
  saving,
}: EditAdjustmentModalProps) {
  const isFee =
    type === 'fee';

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        className="
          w-[calc(100%-1rem)]
          rounded-xl
          border
          border-border
          bg-card
          shadow-2xl
          sm:max-w-md
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            {isFee ? (
              <Wrench className="h-5 w-5 text-primary" />
            ) : (
              <Percent className="h-5 w-5 text-primary" />
            )}

            {isFee
              ? 'Edit Fee'
              : 'Edit Discount'}
          </DialogTitle>

          <DialogDescription className="text-sm">
            {isFee
              ? 'Update this estimate labor charge or service fee.'
              : 'Update this estimate discount.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isFee ? (
            <>
              <Field label="Title">
                <Input
                  value={
                    feeForm.title
                  }
                  onChange={(
                    e
                  ) =>
                    setFeeForm({
                      ...feeForm,
                      title:
                        e.target.value,
                    })
                  }
                  placeholder="e.g., Labor - Engine Work"
                  className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  disabled={
                    saving
                  }
                />
              </Field>

              <Field label="Amount (₱)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    feeForm.amount
                  }
                  onChange={(
                    e
                  ) =>
                    setFeeForm({
                      ...feeForm,
                      amount:
                        e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  disabled={
                    saving
                  }
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Title">
                <Input
                  value={
                    discountForm.title
                  }
                  onChange={(
                    e
                  ) =>
                    setDiscountForm({
                      ...discountForm,
                      title:
                        e.target.value,
                    })
                  }
                  placeholder="e.g., Loyalty Discount"
                  className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  disabled={
                    saving
                  }
                />
              </Field>

              <Field label="Type">
                <Select
                  value={
                    discountForm.type
                  }
                  onValueChange={(
                    value
                  ) =>
                    setDiscountForm({
                      ...discountForm,
                      type:
                        value,
                    })
                  }
                  disabled={
                    saving
                  }
                >
                  <SelectTrigger className="h-11 rounded-md text-base md:h-9 md:text-sm">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="rounded-lg">
                    <SelectItem value="fixed">
                      Fixed (₱)
                    </SelectItem>

                    <SelectItem value="percentage">
                      Percentage (%)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Value">
                <Input
                  type="number"
                  min="0"
                  max={
                    discountForm.type ===
                    'percentage'
                      ? 100
                      : undefined
                  }
                  step="0.01"
                  value={
                    discountForm.value
                  }
                  onChange={(
                    e
                  ) =>
                    setDiscountForm({
                      ...discountForm,
                      value:
                        e.target.value,
                    })
                  }
                  placeholder={
                    discountForm.type ===
                    'fixed'
                      ? '0.00'
                      : '0'
                  }
                  className="h-11 rounded-md text-base md:h-9 md:text-sm"
                  disabled={
                    saving
                  }
                />
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(
                false
              )
            }
            disabled={
              saving
            }
            className="h-11 w-full rounded-md md:h-9 md:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={
              onSave
            }
            disabled={
              saving
            }
            className="h-11 w-full rounded-md px-5 md:h-9 md:w-auto"
          >
            {saving
              ? 'Saving...'
              : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>

      {children}
    </div>
  );
}