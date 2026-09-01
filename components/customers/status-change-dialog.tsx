'use client';

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

import { UserX, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  action: 'deactivate' | 'reactivate';
  onConfirm: () => void;
}

export default function StatusChangeDialog({
  open,
  onOpenChange,
  name,
  action,
  onConfirm,
}: StatusChangeDialogProps) {
  const isDeactivate = action === 'deactivate';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="
          rounded-xl p-5 shadow-xl
          sm:max-w-md md:p-6
        "
      >
        <AlertDialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                isDeactivate
                  ? 'bg-destructive/10'
                  : 'bg-emerald-500/10'
              )}
            >
              {isDeactivate ? (
                <UserX className="h-6 w-6 text-destructive" />
              ) : (
                <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <div className="min-w-0">
              <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                {isDeactivate ? 'Deactivate' : 'Reactivate'} Customer
              </AlertDialogTitle>

              <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isDeactivate ? (
                  <>
                    You are about to deactivate{' '}
                    <strong className="text-foreground">{name}</strong>.
                    This will prevent them from logging in. They can be
                    reactivated later.
                  </>
                ) : (
                  <>
                    You are about to reactivate{' '}
                    <strong className="text-foreground">{name}</strong>.
                    They will be able to log in again.
                  </>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row">
          <AlertDialogCancel
            className="
              h-11 w-full rounded-md px-4 font-medium
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              sm:w-auto
              md:h-9
            "
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              `
              h-11 w-full rounded-md px-4 font-medium
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              sm:w-auto md:h-9
              `,
              isDeactivate
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            Confirm {isDeactivate ? 'Deactivate' : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}