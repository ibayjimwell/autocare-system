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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import {
  Barcode,
  CheckCircle2,
  Loader2,
  PackagePlus,
  ScanLine,
  X,
} from 'lucide-react';

import { toast } from 'sonner';
import { inventoryApi } from '@/lib/inventory/inventory';
import { validateSellingPrice } from '@/utils/inventory';
import BarcodeScannerModal from './barcode-scanner-modal';

interface InventoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
  initialBarcode?: string;
  onSuccess: (item?: any) => void;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  barcode: '',
  quantity: '0',
  unit: 'piece',
  costPrice: '0.00',
  sellingPrice: '0.00',
  reorderLevel: '0',
  lowStockAlert: true,
  active: true,
};

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function toInputValue(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizeBarcode(value: string) {
  return value.trim();
}

export default function InventoryForm({
  open,
  onOpenChange,
  item,
  initialBarcode = '',
  onSuccess,
}: InventoryFormProps) {
  const editing = Boolean(item?.id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setFieldError(null);
      setSaving(false);
      setScannerOpen(false);
      setBarcodeLookupLoading(false);
      return;
    }

    if (item?.id) {
      setForm({
        name: toInputValue(item.name),
        description: toInputValue(item.description),
        barcode: toInputValue(item.barcode),
        quantity: toInputValue(item.quantity, '0'),
        unit: toInputValue(item.unit, 'piece'),
        costPrice: toInputValue(item.costPrice, '0.00'),
        sellingPrice: toInputValue(item.sellingPrice, '0.00'),
        reorderLevel: toInputValue(item.reorderLevel, '0'),
        lowStockAlert: item.lowStockAlert !== false,
        active: item.active !== false,
      });
      return;
    }

    setForm({
      ...EMPTY_FORM,
      barcode: normalizeBarcode(initialBarcode),
    });
  }, [open, item?.id, initialBarcode]);

  const sellingPriceError = validateSellingPrice(
    form.costPrice,
    form.sellingPrice,
  );

  const updateField = (field: string, value: any) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (
      field === 'costPrice' ||
      field === 'sellingPrice' ||
      field === 'name' ||
      field === 'unit'
    ) {
      setFieldError(null);
    }
  };

  const applyBarcodeResult = async (barcode: string) => {
    const normalized = normalizeBarcode(barcode);

    if (!normalized) return;

    updateField('barcode', normalized);
    setBarcodeLookupLoading(true);

    try {
      const result = await inventoryApi.lookupBarcode(normalized);

      if (!result?.error && result?.data) {
        const found = result.data;

        setForm((current) => ({
          ...current,
          name: toInputValue(found.name),
          description: toInputValue(found.description),
          barcode: normalized,
          quantity: toInputValue(found.quantity, '0'),
          unit: toInputValue(found.unit, 'piece'),
          costPrice: toInputValue(found.costPrice, '0.00'),
          sellingPrice: toInputValue(found.sellingPrice, '0.00'),
          reorderLevel: toInputValue(found.reorderLevel, '0'),
          lowStockAlert: found.lowStockAlert !== false,
          active: found.active !== false,
        }));

        toast.success('Barcode found. Item details were filled automatically.');
      } else {
        toast.info(
          'Barcode not found. The barcode is ready and the remaining item details can be entered manually.',
        );
      }
    } catch (error) {
      console.error('[InventoryForm] Barcode lookup error:', error);
      toast.info(
        'Barcode captured. Complete the item details manually.',
      );
    } finally {
      setBarcodeLookupLoading(false);
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    setScannerOpen(false);
    void applyBarcodeResult(barcode);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const unit = form.unit.trim();
    const barcode = normalizeBarcode(form.barcode);

    const quantity = Number(form.quantity);
    const reorderLevel = Number(form.reorderLevel);
    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!name) {
      setFieldError('Item name is required.');
      return;
    }

    if (!unit) {
      setFieldError('Unit is required.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      setFieldError('Quantity must be a whole number greater than or equal to zero.');
      return;
    }

    if (
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0 ||
      !Number.isInteger(reorderLevel)
    ) {
      setFieldError('Reorder level must be a whole number greater than or equal to zero.');
      return;
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setFieldError('Cost price must be zero or greater.');
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setFieldError('Selling price must be zero or greater.');
      return;
    }

    const priceError = validateSellingPrice(
      costPrice,
      sellingPrice,
    );

    if (priceError) {
      setFieldError(priceError);
      return;
    }

    setFieldError(null);
    setSaving(true);

    const payload = {
      name,
      description: form.description.trim(),
      barcode: barcode || null,
      quantity,
      unit,
      costPrice: costPrice.toFixed(2),
      sellingPrice: sellingPrice.toFixed(2),
      reorderLevel,
      lowStockAlert: form.lowStockAlert,
      active: form.active,
    };

    try {
      const result = editing
        ? await inventoryApi.update(item.id, payload)
        : await inventoryApi.create(payload);

      if (result?.error) {
        const message =
          result.errorMessage ||
          (result.errorType === 'duplicate'
            ? 'An item with this barcode already exists.'
            : 'Unable to save inventory item.');

        setFieldError(message);
        toast.error(message);
        return;
      }

      toast.success(
        editing
          ? 'Inventory item updated successfully.'
          : 'Inventory item added successfully.',
      );

      onSuccess(result?.data);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[InventoryForm] Save error:', error);
      const message = error?.message || 'Unable to save inventory item.';
      setFieldError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (saving) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border p-5 pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackagePlus className="h-5 w-5" />
              </span>
              {editing ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update item information, pricing, stock thresholds, and barcode.'
                : 'Add a part, supply, consumable, or automotive product to inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="space-y-5">
              {fieldError ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-sm leading-5 text-destructive">
                  {fieldError}
                </div>
              ) : null}

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Item information
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Identify the automotive part, supply, or consumable.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="inventory-name">Item name</Label>
                    <Input
                      id="inventory-name"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g. Engine Oil 5W-30"
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                      autoFocus={!initialBarcode}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="inventory-description">Description</Label>
                    <Textarea
                      id="inventory-description"
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Optional product or usage details"
                      className={`min-h-24 rounded-md text-base md:text-sm ${focusClass}`}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="inventory-barcode">Barcode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="inventory-barcode"
                        value={form.barcode}
                        onChange={(e) => updateField('barcode', e.target.value)}
                        placeholder="Scan or enter barcode"
                        className={`h-11 min-w-0 flex-1 rounded-md font-mono text-base md:h-9 md:text-sm ${focusClass}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setScannerOpen(true)}
                        disabled={barcodeLookupLoading}
                        className={`h-11 shrink-0 rounded-md px-3 md:h-9 ${focusClass}`}
                      >
                        {barcodeLookupLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ScanLine className="mr-2 h-4 w-4" />
                        )}
                        Scan
                      </Button>
                    </div>
                    {barcodeLookupLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Looking up this barcode in the inventory database…
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock & pricing
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selling price must never be below the recorded cost.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inventory-quantity">Quantity</Label>
                    <Input
                      id="inventory-quantity"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={form.quantity}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventory-unit">Unit</Label>
                    <Input
                      id="inventory-unit"
                      value={form.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                      placeholder="piece, liter, box"
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventory-cost">Cost price (₱)</Label>
                    <Input
                      id="inventory-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={form.costPrice}
                      onChange={(e) => updateField('costPrice', e.target.value)}
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventory-selling">Selling price (₱)</Label>
                    <Input
                      id="inventory-selling"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={form.sellingPrice}
                      onChange={(e) => updateField('sellingPrice', e.target.value)}
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass} ${sellingPriceError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {sellingPriceError ? (
                      <p className="text-xs leading-5 text-destructive">
                        {sellingPriceError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Selling price: ₱{Number(form.sellingPrice || 0).toFixed(2)}
                        {' '}· Cost: ₱{Number(form.costPrice || 0).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="inventory-reorder">Reorder level</Label>
                    <Input
                      id="inventory-reorder"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={form.reorderLevel}
                      onChange={(e) => updateField('reorderLevel', e.target.value)}
                      className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Low-stock alerts trigger when stock reaches or falls below this level.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inventory controls
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Low-stock alerts
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        Enable realtime alerts for this item.
                      </p>
                    </div>
                    <Switch
                      checked={form.lowStockAlert}
                      onCheckedChange={(checked) => updateField('lowStockAlert', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Active item
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        Inactive items stay in records but are excluded from normal selection.
                      </p>
                    </div>
                    <Switch
                      checked={form.active}
                      onCheckedChange={(checked) => updateField('active', checked)}
                    />
                  </div>
                </div>
              </section>

              {form.barcode ? (
                <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Barcode captured
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {form.barcode}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || barcodeLookupLoading}
              className={`h-11 w-full rounded-md px-5 md:h-9 md:w-auto ${focusClass}`}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-2 h-4 w-4" />
              )}
              {saving
                ? editing
                  ? 'Saving Changes…'
                  : 'Adding Item…'
                : editing
                  ? 'Save Changes'
                  : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleBarcodeDetected}
        title="Scan Item Barcode"
        description="Scan a product barcode to look up an existing inventory item or prefill a new item form."
      />
    </>
  );
}
