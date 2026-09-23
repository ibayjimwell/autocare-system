'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  PackagePlus,
  RotateCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { inventoryApi } from '@/lib/inventory/inventory';

interface RestockModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function RestockModal({
  item,
  onClose,
  onSuccess,
}: RestockModalProps) {
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setQty('1');
      setLoading(false);
    }
  }, [item?.id]);

  if (!item) return null;

  const currentStock = Number(item.quantity) || 0;
  const parsedQty = Number(qty);
  const validQty = Number.isFinite(parsedQty) && Number.isInteger(parsedQty) && parsedQty > 0;
  const projectedStock = validQty ? currentStock + parsedQty : currentStock;

  const handleRestock = async () => {
    if (!validQty) {
      toast.error('Quantity must be a positive whole number.');
      return;
    }

    setLoading(true);

    try {
      const res = await inventoryApi.restock(item.id, parsedQty);

      if (res?.error) {
        toast.error(res.errorMessage || 'Restock failed.');
        return;
      }

      toast.success(`${parsedQty} ${item.unit || 'unit'} added to ${item.name}.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[RestockModal] Error:', error);
      toast.error(error?.message || 'Unable to restock item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border p-5 pb-4">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block">Restock Item</span>
              <span className="mt-0.5 block truncate text-sm font-normal text-muted-foreground">
                {item.name}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription>
            Add stock to the selected inventory item.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current stock
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {currentStock}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.unit || 'unit'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Reorder level
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {Number(item.reorderLevel) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    threshold
                  </p>
                </div>
              </div>
            </div>

            {item.barcode ? (
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Barcode
                </p>
                <p className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                  {item.barcode}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Add quantity
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`h-12 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                autoFocus
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Projected stock after restock:{' '}
                <span className="font-semibold text-foreground">
                  {projectedStock} {item.unit || 'unit'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRestock}
            disabled={loading || !validQty}
            className={`h-11 w-full rounded-md px-4 md:h-9 md:w-auto ${focusClass}`}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Restocking...' : 'Confirm Restock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
