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

import {
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface DeleteAdjustmentConfirmationModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  adjustmentType:
    | 'fee'
    | 'discount'
    | null;

  title: string;

  onConfirm: () => void;

  saving: boolean;
}

export default function DeleteAdjustmentConfirmationModal({
  open,
  onOpenChange,
  adjustmentType,
  title,
  onConfirm,
  saving,
}: DeleteAdjustmentConfirmationModalProps) {
  const label =
    adjustmentType ===
    'discount'
      ? 'discount'
      : 'fee';

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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remove {label}?
          </DialogTitle>

          <DialogDescription className="text-sm leading-6">
            This will remove the selected {label} from this pending estimate.
            The estimate totals will be recalculated immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-foreground">
            {title ||
              `Selected ${label}`}
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This action only affects the pending estimate currently being edited.
          </p>
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
            variant="destructive"
            onClick={
              onConfirm
            }
            disabled={
              saving
            }
            className="h-11 w-full rounded-md md:h-9 md:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />

            {saving
              ? 'Removing...'
              : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}