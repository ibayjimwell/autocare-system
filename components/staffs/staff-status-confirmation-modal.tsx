'use client';

import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  ArrowUpFromLine,
  Loader2,
  LogOut,
} from 'lucide-react';

type StaffStatusAction = 'onboard' | 'outboard' | null;

interface StaffStatusConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: StaffStatusAction;
  staffName: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export default function StaffStatusConfirmationModal({
  open,
  onOpenChange,
  action,
  staffName,
  onConfirm,
  isLoading = false,
}: StaffStatusConfirmationModalProps) {
  const isOnboard = action === 'onboard';

  const title = isOnboard
    ? 'Confirm Onboarding'
    : 'Confirm Outboarding';

  const actionLabel = isOnboard ? 'Onboard' : 'Outboard';

  const description = isOnboard
    ? `You are about to onboard ${staffName}. This will restore the staff member's active status in the system.`
    : `You are about to outboard ${staffName}. This will remove the staff member from the active staff status in the system.`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={isLoading ? undefined : onOpenChange}
    >
      <AlertDialogContent
        className="
          w-[calc(100vw-2rem)] max-w-md
          rounded-xl border-border bg-card
          p-5 shadow-xl
          sm:p-6
        "
      >
        <AlertDialogHeader className="space-y-3 text-left">
          <div
            className={`
              flex h-11 w-11 items-center justify-center
              rounded-lg border
              ${
                isOnboard
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }
            `}
          >
            {isOnboard ? (
              <ArrowUpFromLine className="h-5 w-5" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </div>

          <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="
            mt-4 flex items-start gap-3
            rounded-lg border border-amber-500/20
            bg-amber-500/10 p-3.5
          "
        >
          <AlertTriangle
            className="
              mt-0.5 h-4 w-4 shrink-0
              text-amber-600 dark:text-amber-400
            "
          />

          <p className="text-sm font-medium leading-relaxed text-amber-800 dark:text-amber-300">
            You are responsible to this action
          </p>
        </div>

        <AlertDialogFooter
          className="
            mt-5 flex-col-reverse gap-2
            sm:flex-row sm:justify-end
          "
        >
          <AlertDialogCancel
            disabled={isLoading}
            className="
              h-11 w-full rounded-md
              border-border bg-background
              text-base font-medium
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-ring
              focus-visible:ring-offset-2
              sm:h-9 sm:w-auto sm:text-sm
            "
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();

              if (!isLoading) {
                void onConfirm();
              }
            }}
            disabled={isLoading}
            className={`
              h-11 w-full rounded-md
              px-4 text-base font-medium
              text-primary-foreground shadow-sm
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-ring
              focus-visible:ring-offset-2
              sm:h-9 sm:w-auto sm:text-sm
              ${
                isOnboard
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-primary hover:bg-primary/90'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Confirm ${actionLabel}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}