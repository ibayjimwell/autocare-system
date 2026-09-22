'use client';

import React from 'react';

import {
  AlertTriangle,
  FileWarning,
  ShieldAlert,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  Button,
} from '@/components/ui/button';

export type FinalCostChangeAction =
  | 'edit'
  | 'delete';

export type FinalCostChangeType =
  | 'fee'
  | 'discount'
  | 'part';

interface FinalCostChangeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: FinalCostChangeAction;
  type: FinalCostChangeType;
  targetName?: string;
  onConfirm: () => void;
  saving?: boolean;
}

function getTypeLabel(
  type: FinalCostChangeType,
): string {
  switch (type) {
    case 'fee':
      return 'fee';
    case 'discount':
      return 'discount';
    case 'part':
      return 'part/item';
    default:
      return 'item';
  }
}

export default function FinalCostChangeConfirmationModal({
  open,
  onOpenChange,
  action,
  type,
  targetName,
  onConfirm,
  saving = false,
}: FinalCostChangeConfirmationModalProps) {
  const isDelete = action === 'delete';
  const typeLabel = getTypeLabel(type);
  const displayName =
    targetName?.trim() ||
    `this ${typeLabel}`;

  return (
    <Dialog
      open={open}
      onOpenChange={
        saving
          ? undefined
          : onOpenChange
      }
    >
      <DialogContent
        className="
          w-[calc(100%-1rem)]
          max-w-lg
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-2xl
          sm:w-[calc(100%-2rem)]
        "
      >
        <DialogHeader className="border-b border-border bg-background/80 p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              {isDelete ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Confirm Final Cost Change
              </DialogTitle>

              <DialogDescription className="mt-1 leading-5 text-muted-foreground">
                Review and confirm this change before continuing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div className="min-w-0 space-y-2 text-sm leading-5 text-amber-950">
                <p className="font-semibold">
                  You are responsible for making sure this Final Cost change is correct.
                </p>

                <p>
                  {isDelete
                    ? `You are about to permanently remove ${displayName}.`
                    : `You are about to modify ${displayName}.`}
                </p>

                <p>
                  Final Cost editing is available only while the status is{' '}
                  <strong>Pending</strong> or{' '}
                  <strong>Parked</strong>.
                  {' '}
                  Once the Final Cost is sent as an official cost, it is locked and cannot be changed through Final Cost editing.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm leading-5 text-muted-foreground">
            {isDelete
              ? `Please verify that removing this ${typeLabel} is intentional. This action changes the amount that will be presented to the customer.`
              : `Please verify the new ${typeLabel} information before saving it. The updated amount will be included in the Final Cost calculation.`}
          </p>
        </div>

        <DialogFooter className="border-t border-border bg-background/80 p-4 backdrop-blur-xl sm:justify-end">
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
            onClick={onConfirm}
          >
            {saving
              ? 'Processing…'
              : 'I Understand, Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
