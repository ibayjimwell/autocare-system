'use client';
import { Loader2, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ResetPasswordModal({ open, onOpenChange, staffName, isLoading, onConfirm }: { open:boolean; onOpenChange:(v:boolean)=>void; staffName:string; isLoading:boolean; onConfirm:()=>void }) {
  return <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><TriangleAlert className="h-5 w-5" /></div>
        <DialogTitle>Reset staff password?</DialogTitle>
        <DialogDescription className="leading-6">Make sure <strong>{staffName}</strong> has forgotten the password or genuinely needs it reset. This replaces the current password with a temporary password and requires the staff member to change it on the next login.</DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">The temporary password is shown only after a successful reset. Copy it before closing the password window.</div>
      <DialogFooter><Button variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={isLoading} onClick={onConfirm}>{isLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Resetting...</> : <><RotateCcw className="h-4 w-4"/>Reset Password</>}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
