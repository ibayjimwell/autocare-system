'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Percent,
  Plus,
  Save,
  Settings2,
  Tag,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_PAYMENT_CONFIGURATION,
  PaymentConfiguration,
  PaymentDefaultDiscount,
  PaymentDefaultFee,
  normalizePaymentConfiguration,
  paymentsConfigurationApi,
} from '@/lib/payments/configuration';

interface PaymentsConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (config: PaymentConfiguration) => void;
}

function createId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function PaymentsConfigurationModal({
  open,
  onOpenChange,
  onSaved,
}: PaymentsConfigurationModalProps) {
  const [config, setConfig] = useState<PaymentConfiguration>(DEFAULT_PAYMENT_CONFIGURATION);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newDiscountTitle, setNewDiscountTitle] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [newDiscountValue, setNewDiscountValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsConfigurationApi.get();
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load payment configuration.');
        return;
      }
      setConfig(res.data || DEFAULT_PAYMENT_CONFIGURATION);
    } catch (error: any) {
      console.error('[PaymentsConfigurationModal] load error:', error);
      toast.error(error?.message || 'Failed to load payment configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  const activeFees = useMemo(
    () => config.defaultFees.filter((fee) => fee.isActive),
    [config.defaultFees],
  );

  const activeDiscounts = useMemo(
    () => config.defaultDiscounts.filter((discount) => discount.isActive),
    [config.defaultDiscounts],
  );

  const setFee = (id: string, patch: Partial<PaymentDefaultFee>) => {
    setConfig((current) => ({
      ...current,
      defaultFees: current.defaultFees.map((fee) =>
        fee.id === id ? { ...fee, ...patch } : fee,
      ),
    }));
  };

  const setDiscount = (id: string, patch: Partial<PaymentDefaultDiscount>) => {
    setConfig((current) => ({
      ...current,
      defaultDiscounts: current.defaultDiscounts.map((discount) =>
        discount.id === id ? { ...discount, ...patch } : discount,
      ),
    }));
  };

  const addFee = () => {
    const title = newFeeTitle.trim();
    const amount = Number(newFeeAmount);

    if (!title) {
      toast.error('Default fee title is required.');
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Default fee amount must be zero or greater.');
      return;
    }

    setConfig((current) => ({
      ...current,
      defaultFees: [
        ...current.defaultFees,
        {
          id: createId('fee'),
          title,
          amount,
          isActive: true,
        },
      ],
    }));

    setNewFeeTitle('');
    setNewFeeAmount('');
  };

  const addDiscount = () => {
    const title = newDiscountTitle.trim();
    const value = Number(newDiscountValue);

    if (!title) {
      toast.error('Default discount title is required.');
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      toast.error('Default discount value must be zero or greater.');
      return;
    }

    if (newDiscountType === 'percentage' && value > 100) {
      toast.error('Percentage discounts cannot exceed 100%.');
      return;
    }

    setConfig((current) => ({
      ...current,
      defaultDiscounts: [
        ...current.defaultDiscounts,
        {
          id: createId('discount'),
          title,
          type: newDiscountType,
          value,
          isActive: true,
        },
      ],
    }));

    setNewDiscountTitle('');
    setNewDiscountValue('');
  };

  const removeFee = (id: string) => {
    setConfig((current) => ({
      ...current,
      defaultFees: current.defaultFees.filter((fee) => fee.id !== id),
    }));
  };

  const removeDiscount = (id: string) => {
    setConfig((current) => ({
      ...current,
      defaultDiscounts: current.defaultDiscounts.filter((discount) => discount.id !== id),
    }));
  };

  const save = async () => {
    const parkingFeePerDay = Number(config.parkingFeePerDay);

    if (!Number.isFinite(parkingFeePerDay) || parkingFeePerDay < 0) {
      toast.error('Parking fee must be zero or greater.');
      return;
    }

    for (const fee of config.defaultFees) {
      if (!fee.title.trim() || !Number.isFinite(Number(fee.amount)) || Number(fee.amount) < 0) {
        toast.error('Every default fee needs a valid title and amount.');
        return;
      }
    }

    for (const discount of config.defaultDiscounts) {
      if (
        !discount.title.trim() ||
        !Number.isFinite(Number(discount.value)) ||
        Number(discount.value) < 0 ||
        (discount.type === 'percentage' && Number(discount.value) > 100)
      ) {
        toast.error('Every default discount needs a valid title and value.');
        return;
      }
    }

    const normalized = normalizePaymentConfiguration({
      ...config,
      parkingFeePerDay,
    });

    setSaving(true);

    try {
      const res = await paymentsConfigurationApi.save(normalized);

      if (res.error || !res.data) {
        toast.error(res.errorMessage || 'Failed to save payment configuration.');
        return;
      }

      setConfig(res.data);
      onSaved?.(res.data);
      toast.success('Payment configuration saved.');
    } catch (error: any) {
      console.error('[PaymentsConfigurationModal] save error:', error);
      toast.error(error?.message || 'Failed to save payment configuration.');
    } finally {
      setSaving(false);
    }
  };

  const resetLocalState = () => {
    setNewFeeTitle('');
    setNewFeeAmount('');
    setNewDiscountTitle('');
    setNewDiscountType('fixed');
    setNewDiscountValue('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        if (!nextOpen) resetLocalState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          flex
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-none
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-card
          p-0
          shadow-2xl
          sm:h-auto
          sm:max-h-[90vh]
          sm:w-[calc(100vw-2rem)]
          sm:max-w-5xl
        "
      >
        <DialogHeader className="shrink-0 border-b border-border bg-background/80 p-4 backdrop-blur-xl sm:p-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            <Settings2 className="h-5 w-5 text-primary" />
            Payments Configuration
          </DialogTitle>
          <DialogDescription className="text-xs leading-5 sm:text-sm">
            Configure parking charges and reusable billing defaults for the Payments module.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              Loading configuration…
            </div>
          ) : (
            <div className="space-y-5">
              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Car className="h-4 w-4 text-primary" />
                    Parking Fee
                  </CardTitle>
                  <p className="text-xs leading-5 text-muted-foreground">
                    This amount is the parking rate per billable day. Parking time is always billed in whole days, with any partial day counting as one day.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md space-y-2">
                    <Label htmlFor="payment-parking-fee">Parking Fee per Day</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₱</span>
                      <Input
                        id="payment-parking-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={config.parkingFeePerDay}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            parkingFeePerDay: Number(event.target.value || 0),
                          }))
                        }
                        className="pl-8"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Example: ₱100/day parked for 26 hours = 2 billable days = ₱200.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Tag className="h-4 w-4 text-primary" />
                        Default Fees Management
                      </CardTitle>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Maintain reusable fees for billing workflows.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {activeFees.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="default-fee-title">Fee Title</Label>
                        <Input
                          id="default-fee-title"
                          value={newFeeTitle}
                          onChange={(event) => setNewFeeTitle(event.target.value)}
                          placeholder="e.g. Diagnostic Fee"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-fee-amount">Amount</Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₱</span>
                          <Input
                            id="default-fee-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newFeeAmount}
                            onChange={(event) => setNewFeeAmount(event.target.value)}
                            className="pl-8"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={addFee} className="h-10 md:h-9">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Fee
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {config.defaultFees.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                        No default fees configured.
                      </div>
                    ) : (
                      config.defaultFees.map((fee) => (
                        <div key={fee.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_150px_auto] sm:items-center">
                          <div className="min-w-0">
                            <Input
                              value={fee.title}
                              onChange={(event) => setFee(fee.id, { title: event.target.value })}
                              aria-label="Default fee title"
                            />
                          </div>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₱</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fee.amount}
                              onChange={(event) => setFee(fee.id, { amount: Number(event.target.value || 0) })}
                              className="pl-8"
                              aria-label="Default fee amount"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 sm:justify-end">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox
                                checked={fee.isActive}
                                onCheckedChange={(checked) => setFee(fee.id, { isActive: checked === true })}
                              />
                              Active
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFee(fee.id)}
                              className="h-9 w-9 rounded-md text-destructive hover:bg-destructive/10"
                              aria-label="Remove default fee"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Percent className="h-4 w-4 text-primary" />
                        Default Discount Management
                      </CardTitle>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Maintain reusable fixed or percentage discounts for billing workflows.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {activeDiscounts.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_150px_130px_auto] lg:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="default-discount-title">Discount Title</Label>
                        <Input
                          id="default-discount-title"
                          value={newDiscountTitle}
                          onChange={(event) => setNewDiscountTitle(event.target.value)}
                          placeholder="e.g. Senior Discount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <select
                          value={newDiscountType}
                          onChange={(event) => setNewDiscountType(event.target.value as 'fixed' | 'percentage')}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-discount-value">
                          Value
                        </Label>
                        <div className="relative">
                          {newDiscountType === 'fixed' && (
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₱</span>
                          )}
                          <Input
                            id="default-discount-value"
                            type="number"
                            min="0"
                            max={newDiscountType === 'percentage' ? 100 : undefined}
                            step="0.01"
                            value={newDiscountValue}
                            onChange={(event) => setNewDiscountValue(event.target.value)}
                            className={newDiscountType === 'fixed' ? 'pl-8' : ''}
                            placeholder={newDiscountType === 'percentage' ? '0' : '0.00'}
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={addDiscount} className="h-10 lg:h-9">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Discount
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {config.defaultDiscounts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                        No default discounts configured.
                      </div>
                    ) : (
                      config.defaultDiscounts.map((discount) => (
                        <div key={discount.id} className="grid gap-3 rounded-xl border border-border p-3 lg:grid-cols-[1fr_140px_150px_auto] lg:items-center">
                          <Input
                            value={discount.title}
                            onChange={(event) => setDiscount(discount.id, { title: event.target.value })}
                            aria-label="Default discount title"
                          />
                          <select
                            value={discount.type}
                            onChange={(event) => setDiscount(discount.id, { type: event.target.value as 'fixed' | 'percentage' })}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                            aria-label="Default discount type"
                          >
                            <option value="fixed">Fixed</option>
                            <option value="percentage">Percentage</option>
                          </select>
                          <div className="relative">
                            {discount.type === 'fixed' && (
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₱</span>
                            )}
                            <Input
                              type="number"
                              min="0"
                              max={discount.type === 'percentage' ? 100 : undefined}
                              step="0.01"
                              value={discount.value}
                              onChange={(event) => setDiscount(discount.id, { value: Number(event.target.value || 0) })}
                              className={discount.type === 'fixed' ? 'pl-8' : ''}
                              aria-label="Default discount value"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 lg:justify-end">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox
                                checked={discount.isActive}
                                onCheckedChange={(checked) => setDiscount(discount.id, { isActive: checked === true })}
                              />
                              Active
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDiscount(discount.id)}
                              className="h-9 w-9 rounded-md text-destructive hover:bg-destructive/10"
                              aria-label="Remove default discount"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <WalletCards className="h-4 w-4" />
                {activeFees.length} active fees · {activeDiscounts.length} active discounts
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                Saving…
              </span>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
