'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface TempPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempPassword: string;
  staffName: string;
  onComplete: () => void;
}

export default function TempPasswordDialog({
  open,
  onOpenChange,
  tempPassword,
  staffName,
  onComplete,
}: TempPasswordDialogProps) {
  const [show, setShow] =
    useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      tempPassword
    );

    alert('Password copied');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          rounded-xl
          p-5 shadow-xl
          sm:max-w-md
          md:p-6
        "
      >
        <DialogHeader className="items-center text-center">
          <div
            className="
              mb-3 flex h-14 w-14
              items-center justify-center
              rounded-full
              bg-emerald-500/10
            "
          >
            <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            Personnel Registered
          </DialogTitle>

          <DialogDescription className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            System access has been
            provisioned for{' '}
            <strong className="text-foreground">
              {staffName}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="
              relative overflow-hidden
              rounded-lg
              bg-foreground
              p-4 text-background
              md:p-5
            "
          >
            <div
              className="
                pointer-events-none
                absolute -right-12 -top-12
                h-24 w-24 rounded-full
                bg-primary/10 blur-2xl
              "
            />

            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-background/50">
              Temporary password
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <code className="break-all text-center font-mono text-xl font-semibold tracking-tight md:text-2xl">
                {show
                  ? tempPassword
                  : '••••••••'}
              </code>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    show
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="
                    h-10 w-10 rounded-md
                    text-background/60
                    hover:bg-background/10
                    hover:text-background
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-foreground
                  "
                  onClick={() =>
                    setShow(!show)
                  }
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Copy password"
                  className="
                    h-10 w-10 rounded-md
                    text-background/60
                    hover:bg-background/10
                    hover:text-background
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-foreground
                  "
                  onClick={
                    copyToClipboard
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className="
              flex items-start gap-3
              rounded-lg
              border border-border
              bg-muted/40
              p-3.5
            "
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Account created
              successfully. Provide these
              credentials to the staff
              member. A password reset will
              be forced upon first login.
            </p>
          </div>

          <Button
            type="button"
            className="
              h-11 w-full rounded-md
              font-medium
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-9
            "
            onClick={onComplete}
          >
            Complete Onboarding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}