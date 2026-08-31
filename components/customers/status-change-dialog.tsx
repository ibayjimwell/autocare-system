// components/customers/status-change-dialog.tsx
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
  open, onOpenChange, name, action, onConfirm,
}: StatusChangeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl p-6 shadow-lg">
        <AlertDialogHeader>
          <div className={cn(
            "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full md:mx-0",
            action === 'deactivate' ? "bg-destructive/10" : "bg-emerald-500/10",
          )}>
            {action === 'deactivate' ? (
              <UserX className="h-7 w-7 text-destructive" />
            ) : (
              <UserCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <AlertDialogTitle className="text-lg font-semibold text-foreground">
            {action === 'deactivate' ? 'Deactivate' : 'Reactivate'} Customer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {action === 'deactivate'
              ? <>You are about to deactivate <strong className="text-foreground">{name}</strong>. This will prevent them from logging in. They can be reactivated later.</>
              : <>You are about to reactivate <strong className="text-foreground">{name}</strong>. They will be able to log in again.</>
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel className="h-11 rounded-md px-4 font-medium md:h-9">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              "h-11 rounded-md px-4 font-medium md:h-9",
              action === 'deactivate'
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
          >
            Confirm {action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}