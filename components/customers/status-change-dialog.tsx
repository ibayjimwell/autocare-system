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
      <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
        <AlertDialogHeader>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0",
            action === 'deactivate' ? "bg-destructive/10" : "bg-green-100"
          )}>
            {action === 'deactivate' ? (
              <UserX className="w-8 h-8 text-destructive" />
            ) : (
              <UserCheck className="w-8 h-8 text-green-600" />
            )}
          </div>
          <AlertDialogTitle className="text-2xl font-black text-slate-900">
            {action === 'deactivate' ? 'Deactivate' : 'Reactivate'} Customer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-slate-600">
            {action === 'deactivate'
              ? <>You are about to deactivate <strong>{name}</strong>. This will prevent them from logging in. They can be reactivated later.</>
              : <>You are about to reactivate <strong>{name}</strong>. They will be able to log in again.</>
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3">
          <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              "h-12 rounded-xl font-bold px-6",
              action === 'deactivate' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-green-600 text-white hover:bg-green-700"
            )}
          >
            Confirm {action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}