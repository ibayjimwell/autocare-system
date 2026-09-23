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
import {
  AlertTriangle,
  Barcode,
  Package,
  Pencil,
  RotateCw,
} from 'lucide-react';
import { toNumber, formatCurrency } from '@/app-utils/inventory/inventory';

interface LowStockAlertModalProps {
  item: any;
  lowStockCount: number;
  onOpenChange: (open: boolean) => void;
  onRestock: (item: any) => void;
  onEdit: (item: any) => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function LowStockAlertModal({
  item,
  lowStockCount,
  onOpenChange,
  onRestock,
  onEdit,
}: LowStockAlertModalProps) {
  if (!item) return null;

  const quantity = toNumber(item.quantity);
  const reorderLevel = toNumber(item.reorderLevel);
  const outOfStock = quantity <= 0;

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border p-5">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Low Stock Alert
          </DialogTitle>
          <DialogDescription>
            Inventory stock has reached or fallen below its configured reorder level.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {item.name}
                  </p>
                  {item.barcode ? (
                    <p className="mt-1 flex items-center gap-1.5 break-all font-mono text-xs text-muted-foreground">
                      <Barcode className="h-3 w-3 shrink-0" />
                      {item.barcode}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Current stock
                </p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {quantity}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.unit || 'unit'}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Reorder level
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {reorderLevel}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  trigger threshold
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Selling price
                </p>
                <p className="mt-1 text-base font-semibold text-primary">
                  ₱{formatCurrency(item.sellingPrice)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Low-stock items
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {lowStockCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  currently flagged
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-5 text-muted-foreground">
              {outOfStock
                ? 'This item is out of stock and should be replenished before the next service requires it.'
                : 'This item is at or below its configured reorder level. Consider restocking it soon.'}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Close
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onEdit(item);
            }}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Item
          </Button>

          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onRestock(item);
            }}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Restock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
