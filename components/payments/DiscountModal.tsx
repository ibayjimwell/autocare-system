'use client';

import React, {
  useEffect,
  useState,
} from 'react';

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
  Percent,
} from 'lucide-react';

import {
  DEFAULT_DISCOUNT_PRESETS,
} from '@/app-utils/payments/payment-defaults';

interface DiscountModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  form: {
    title: string;
    type: string;
    value: string;
  };

  setForm: (
    form: {
      title: string;
      type: string;
      value: string;
    }
  ) => void;

  onSave: () => void;

  saving: boolean;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function DiscountModal({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
}: DiscountModalProps) {
  const [
    preset,
    setPreset,
  ] = useState(
    'custom'
  );

  useEffect(() => {
    if (open) {
      setPreset('custom');
    }
  }, [open]);

  const handlePresetChange = (
    value: string
  ) => {
    setPreset(value);

    if (value === 'custom') {
      return;
    }

    const selected =
      DEFAULT_DISCOUNT_PRESETS.find(
        (item) =>
          item.id === value
      );

    if (!selected) {
      return;
    }

    setForm({
      title:
        selected.title,
      type:
        selected.type,
      value:
        selected.value.toString(),
    });
  };

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
            <Percent className="h-5 w-5 text-primary" />
            Add Discount
          </DialogTitle>

          <DialogDescription className="text-sm">
            Apply a standard or custom discount to the estimate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* =====================================================
              DEFAULT DISCOUNT
          ====================================================== */}

          <Field label="Default Discount">
            <Select
              value={
                preset
              }
              onValueChange={
                handlePresetChange
              }
            >
              <SelectTrigger
                className={`
                  h-11
                  rounded-md
                  text-base
                  md:h-9
                  md:text-sm
                  ${focusClass}
                `}
              >
                <SelectValue placeholder="Select discount preset" />
              </SelectTrigger>

              <SelectContent className="rounded-lg">
                <SelectItem value="custom">
                  Custom Discount
                </SelectItem>

                {DEFAULT_DISCOUNT_PRESETS.map(
                  (
                    discount
                  ) => (
                    <SelectItem
                      key={
                        discount.id
                      }
                      value={
                        discount.id
                      }
                    >
                      {discount.title}{' '}
                      —{' '}
                      {discount.type ===
                      'fixed'
                        ? `₱${discount.value.toFixed(2)}`
                        : `${discount.value}%`}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              Select a standard discount or create a custom one.
            </p>
          </Field>

          {/* =====================================================
              TITLE
          ====================================================== */}

          <Field label="Title">
            <Input
              value={
                form.title
              }
              onChange={(
                e
              ) =>
                setForm({
                  ...form,
                  title:
                    e.target.value,
                })
              }
              placeholder="e.g., Loyalty Discount"
              className={`
                h-11
                rounded-md
                text-base
                md:h-9
                md:text-sm
                ${focusClass}
              `}
            />
          </Field>

          {/* =====================================================
              TYPE
          ====================================================== */}

          <Field label="Type">
            <Select
              value={
                form.type
              }
              onValueChange={(
                value
              ) =>
                setForm({
                  ...form,
                  type:
                    value,
                })
              }
            >
              <SelectTrigger
                className={`
                  h-11
                  rounded-md
                  text-base
                  md:h-9
                  md:text-sm
                  ${focusClass}
                `}
              >
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

          {/* =====================================================
              VALUE
          ====================================================== */}

          <Field label="Value">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={
                form.value
              }
              onChange={(
                e
              ) =>
                setForm({
                  ...form,
                  value:
                    e.target.value,
                })
              }
              placeholder={
                form.type ===
                'fixed'
                  ? '0.00'
                  : '0'
              }
              className={`
                h-11
                rounded-md
                text-base
                md:h-9
                md:text-sm
                ${focusClass}
              `}
            />

            <p className="text-xs text-muted-foreground">
              {form.type ===
              'fixed'
                ? 'Enter a fixed amount in ₱.'
                : 'Enter a percentage from 0 to 100.'}
            </p>
          </Field>
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
            className={`
              h-11
              w-full
              rounded-md
              md:h-9
              md:w-auto
              ${focusClass}
            `}
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
            className={`
              h-11
              w-full
              rounded-md
              px-5
              md:h-9
              md:w-auto
              ${focusClass}
            `}
          >
            {saving
              ? 'Adding...'
              : 'Add Discount'}
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