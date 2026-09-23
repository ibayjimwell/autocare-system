'use client';

import React, { useMemo, useState } from 'react';
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
import {
  Banknote,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { posApi } from '@/lib/inventory/inventory';
import InventoryPicker from './inventory-picker';
import PosHistoryModal from './pos-history-modal';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import { useAuth } from '@/hooks/use-auth';

interface POSModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  stock: number;
  unit?: string;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function POSModal({
  open,
  onClose,
  onCompleted,
}: POSModalProps) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentReceived, setPaymentReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.sellingPrice * item.quantity,
        0,
      ),
    [cart],
  );

  const payment = Number.parseFloat(paymentReceived) || 0;
  const change = Math.round((payment - total) * 100) / 100;
  const canPay = total > 0 && payment >= total;

  const addItem = (selected: {
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }) => {
    const stock = Number(selected.quantity) || 0;

    if (stock <= 0) {
      toast.error(`${selected.name} is out of stock.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === selected.id);

      if (!existing) {
        return [
          ...current,
          {
            id: selected.id,
            name: selected.name,
            quantity: 1,
            sellingPrice: selected.price,
            stock,
          },
        ];
      }

      if (existing.quantity >= existing.stock) {
        toast.error(`Only ${existing.stock} ${existing.stock === 1 ? 'unit' : 'units'} of ${existing.name} are available.`);
        return current;
      }

      return current.map((item) =>
        item.id === selected.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  };

  const updateQuantity = (id: string, nextQuantity: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;
          const quantity = Math.min(
            Math.max(1, nextQuantity),
            item.stock,
          );
          return { ...item, quantity };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const reset = () => {
    setCart([]);
    setPaymentReceived('');
  };

  const handleComplete = async () => {
    if (total <= 0) {
      toast.error('Add at least one item to the cart.');
      return;
    }

    if (payment < total) {
      toast.error('Insufficient payment amount.');
      return;
    }

    setLoading(true);

    try {
      const result = await posApi.createTransaction({
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
        })),
        paymentReceived: payment,
        staffId: user?.id,
      });

      if (result?.error) {
        toast.error(result.errorMessage || 'Transaction failed.');
        return;
      }

      toast.success('POS sale completed successfully.');
      reset();
      onCompleted();
      onClose();
    } catch (error: any) {
      console.error('[POSModal] Complete error:', error);
      toast.error(error?.message || 'Unable to complete transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !loading) onClose();
        }}
      >
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Point of Sale
                </DialogTitle>
                <DialogDescription>
                  Sell parts, supplies, and consumables while deducting stock.
                </DialogDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryOpen(true)}
                disabled={loading}
                className={`h-11 shrink-0 rounded-md md:h-9 ${focusClass}`}
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Products
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Search inventory and add items to the sale.
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4">
                  <InventoryPicker onSelect={addItem}>
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add product
                    </>
                  </InventoryPicker>
                </div>

                <div className="mt-4 space-y-2">
                  {cart.length === 0 ? (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        Cart is empty
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Add an inventory item to begin a POS sale.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              ₱{formatCurrency(item.sellingPrice)} each · {item.stock} available
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-primary">
                            ₱{formatCurrency(item.sellingPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment summary
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Complete the sale after receiving payment.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total sale
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
                    ₱{formatCurrency(total)}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <label htmlFor="pos-payment" className="text-sm font-medium text-foreground">
                    Payment received (₱)
                  </label>
                  <Input
                    id="pos-payment"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.value)}
                    placeholder="Enter amount received"
                    className="h-12 rounded-md text-base md:h-9 md:text-sm"
                  />
                </div>

                <div
                  className={`mt-3 rounded-xl border p-4 ${
                    canPay
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Change
                      </p>
                    </div>
                    <p className={`text-xl font-bold ${canPay ? 'text-emerald-600' : 'text-foreground'}`}>
                      ₱{formatCurrency(Math.max(change, 0))}
                    </p>
                  </div>

                  {!canPay && payment > 0 ? (
                    <p className="mt-2 text-xs text-destructive">
                      Additional payment needed: ₱{formatCurrency(Math.max(total - payment, 0))}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={loading}
              className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleComplete}
              disabled={loading || !canPay}
              className={`h-11 w-full rounded-md px-5 md:h-9 md:w-auto ${focusClass}`}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Processing Sale…' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PosHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
