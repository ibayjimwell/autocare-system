'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, X, PackagePlus } from 'lucide-react';
import { inventoryApi } from '@/lib/inventory/inventory';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onSuccess: () => void;
}

export default function InventoryForm({
  open,
  onOpenChange,
  item,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 0,
    lowStockAlert: true,
    active: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || '',
        costPrice: parseFloat(item.costPrice) || 0,
        sellingPrice: parseFloat(item.sellingPrice) || 0,
        reorderLevel: item.reorderLevel || 0,
        lowStockAlert: item.lowStockAlert ?? true,
        active: item.active ?? true,
      });
    } else {
      setForm({
        name: '',
        description: '',
        quantity: 0,
        unit: '',
        costPrice: 0,
        sellingPrice: 0,
        reorderLevel: 0,
        lowStockAlert: true,
        active: true,
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...form };

    const res = item
      ? await inventoryApi.update(item.id, payload)
      : await inventoryApi.create(payload);

    if (res.error) {
      toast.error(res.errorMessage || 'Error');
    } else {
      toast.success(item ? 'Item updated' : 'Item created');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>

            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {item ? 'Edit Item' : 'New Item'}
              </DialogTitle>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {item
                  ? 'Update inventory information and pricing.'
                  : 'Add a new part, supply, or consumable.'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Item name <span className="text-primary">*</span>
            </Label>

            <Input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              required
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
              placeholder="e.g. Engine Oil 5W-30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Description
            </Label>

            <Input
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Quantity
              </Label>

              <Input
                type="number"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: +e.target.value,
                  })
                }
                className="h-11 rounded-md text-base md:h-9 md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Unit <span className="text-primary">*</span>
              </Label>

              <Input
                value={form.unit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unit: e.target.value,
                  })
                }
                required
                className="h-11 rounded-md text-base md:h-9 md:text-sm"
                placeholder="pcs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Cost price (₱)
              </Label>

              <Input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    costPrice: +e.target.value,
                  })
                }
                className="h-11 rounded-md text-base md:h-9 md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Selling price (₱)
              </Label>

              <Input
                type="number"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sellingPrice: +e.target.value,
                  })
                }
                className="h-11 rounded-md text-base md:h-9 md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Reorder level
            </Label>

            <Input
              type="number"
              value={form.reorderLevel}
              onChange={(e) =>
                setForm({
                  ...form,
                  reorderLevel: +e.target.value,
                })
              }
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inventory settings
            </p>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md">
              <Checkbox
                checked={form.lowStockAlert}
                onCheckedChange={(c) =>
                  setForm({
                    ...form,
                    lowStockAlert: !!c,
                  })
                }
              />

              <span className="text-sm text-foreground">
                Enable low stock alerts
              </span>
            </label>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md">
              <Checkbox
                checked={form.active}
                onCheckedChange={(c) =>
                  setForm({
                    ...form,
                    active: !!c,
                  })
                }
              />

              <span className="text-sm text-foreground">
                Item is active
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-md px-4 md:h-9"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-md px-4 md:h-9"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {item ? 'Update item' : 'Create item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}