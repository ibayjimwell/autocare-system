'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  RotateCw,
  X,
  PackagePlus,
  Loader2,
} from 'lucide-react';

import { toast } from 'sonner';
import { inventoryApi } from '@/lib/inventory/inventory';

export default function RestockModal({
  item,
  onClose,
  onSuccess,
}: {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const handleRestock = async () => {
    setLoading(true);

    const res = await inventoryApi.restock(item.id, qty);

    if (res.error) {
      toast.error(res.errorMessage || 'Restock failed');
    } else {
      toast.success(`${qty} added to ${item.name}`);
      onSuccess();
      onClose();
    }

    setLoading(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="rounded-xl sm:max-w-sm">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>

            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Restock item
              </DialogTitle>

              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {item.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Current stock
                </p>

                <p className="mt-1 text-xl font-semibold text-foreground">
                  {item.quantity}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit
                </p>

                <p className="mt-1 text-xl font-semibold text-foreground">
                  {item.unit || 'unit'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Add quantity
            </Label>

            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(+e.target.value)}
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-11 rounded-md px-4 md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button
            onClick={handleRestock}
            disabled={loading}
            className="h-11 rounded-md px-4 md:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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