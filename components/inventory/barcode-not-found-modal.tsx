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
import { Barcode, Keyboard, ScanLine } from 'lucide-react';

interface BarcodeNotFoundModalProps {
  open: boolean;
  barcode: string;
  onOpenChange: (open: boolean) => void;
  onAddManual: () => void;
  onAddWithBarcode: () => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function BarcodeNotFoundModal({
  open,
  barcode,
  onOpenChange,
  onAddManual,
  onAddWithBarcode,
}: BarcodeNotFoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border p-5">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              <Barcode className="h-5 w-5" />
            </span>
            Item Not Found
          </DialogTitle>
          <DialogDescription>
            No inventory item is registered with this barcode.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Scanned barcode
              </p>
              <p className="mt-2 break-all font-mono text-base font-semibold tracking-wide text-foreground">
                {barcode || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4 text-sm leading-5 text-muted-foreground">
              Add this product to inventory first. You can enter the details manually, or keep the scanned barcode and complete the item form.
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={onAddManual}
                className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Keyboard className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Add Manually
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Open a blank Add Item form and enter all product information.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={onAddWithBarcode}
                className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-left transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ScanLine className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Add With Barcode
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Open the Add Item form with the scanned barcode already filled in.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
