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
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (
    open: boolean
  ) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  variant?:
    | 'default'
    | 'destructive';
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  variant = 'default',
}: ConfirmationDialogProps) {
  const isDestructive =
    variant === 'destructive';

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent
        className="
          rounded-xl
          border-border
          bg-card
          p-5
          shadow-xl
          sm:max-w-md
          md:p-6
        "
      >
        <AlertDialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={cn(
                `
                flex h-12 w-12
                shrink-0
                items-center
                justify-center
                rounded-lg
                `,
                isDestructive
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isDestructive ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0">
              <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </AlertDialogTitle>

              <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter
          className="
            mt-6
            flex-col-reverse
            gap-2
            sm:flex-row
          "
        >
          <AlertDialogCancel
            className="
              h-11 w-full
              rounded-md
              px-4
              font-medium
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
              h-11 w-full
              rounded-md
              px-4
              font-medium
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              sm:w-auto
              md:h-9
              `,
              isDestructive
                ? `
                  bg-destructive
                  text-destructive-foreground
                  hover:bg-destructive/90
                `
                : `
                  bg-primary
                  text-primary-foreground
                  hover:bg-primary/90
                `
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}