'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TempPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempPassword: string;
  staffName: string;
  onComplete: () => void;   // will open access assignment
}

export default function TempPasswordDialog({
  open, onOpenChange, tempPassword, staffName, onComplete,
}: TempPasswordDialogProps) {
  const [show, setShow] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    alert('Password copied');  // replace with toast if desired
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] sm:max-w-md border-none shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-green-500" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-800">
            Personnel Registered
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            System access has been provisioned for <strong>{staffName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-900 p-6 rounded-[2rem] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
            Temporary Password
          </p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-3xl font-mono font-black text-white tracking-tighter">
              {show ? tempPassword : '••••••••'}
            </code>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white"
                onClick={() => setShow(!show)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white"
                onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Account created successfully. Provide these credentials to the staff member.
            A password reset will be forced upon first login for security compliance.
          </p>
        </div>

        <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest"
          onClick={onComplete}>
          Complete Onboarding
        </Button>
      </DialogContent>
    </Dialog>
  );
}