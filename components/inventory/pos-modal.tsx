'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Package,
  Banknote,
} from 'lucide-react';

import { useInventory } from '@/hooks/inventory/use-inventory';
import { posApi } from '@/lib/inventory/inventory';
import { toast } from 'sonner';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import PosHistoryModal from './pos-history-modal';

export default function POSModal({
  open,
  onClose,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { items, search, setSearch } = useInventory(true);

  const [cart, setCart] = useState<
    {
      id: string;
      name: string;
      sellingPrice: number;
      quantity: number;
    }[]
  >([]);

  const [payment, setPayment] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const addToCart = (item: any) => {
    if (item.quantity <= 0) {
      toast.error('Out of stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);

      if (existing) {
        const newQty = existing.quantity + 1;

        if (newQty > item.quantity) {
          toast.error('Not enough stock');
          return prev;
        }

        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: newQty,
              }
            : i,
        );
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          sellingPrice: parseFloat(item.sellingPrice),
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;

          const newQty = i.quantity + delta;

          if (newQty < 1) return i;

          return {
            ...i,
            quantity: newQty,
          };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const totalAmount = cart.reduce(
    (sum, i) => sum + i.sellingPrice * i.quantity,
    0,
  );

  const change = payment - totalAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (payment < totalAmount) {
      toast.error('Insufficient payment');
      return;
    }

    setProcessing(true);

    const res = await posApi.createTransaction({
      items: cart,
      paymentReceived: payment,
    });

    if (res.error) {
      toast.error(res.errorMessage);
    } else {
      toast.success('Sale completed!');
      onCompleted();
      onClose();
    }

    setProcessing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="flex max-h-[95vh] flex-col rounded-xl p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </div>

                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Point of Sale
                  </DialogTitle>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select products and complete a cash transaction.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="h-9 rounded-md px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Receipt className="mr-1.5 h-4 w-4" />
                History
              </Button>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0 md:flex-row">
            {/* Products */}
            <div className="min-w-0 flex-1 border-b border-border p-4 md:border-b-0 md:border-r sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Products
                  </p>

                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    Available inventory
                  </h3>
                </div>

                <Package className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  placeholder="Search product..."
                  className="h-11 rounded-md pl-10 text-base md:h-9 md:text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <ScrollArea className="mt-4 h-[42vh] md:h-[calc(100vh-290px)]">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((item) => {
                    const isOut = item.quantity <= 0;

                    return (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              ₱
                              {parseFloat(item.sellingPrice).toFixed(2)}
                            </span>

                            <span>·</span>

                            <span
                              className={
                                isOut
                                  ? 'font-medium text-red-600'
                                  : ''
                              }
                            >
                              Qty: {item.quantity}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="outline"
                          disabled={isOut}
                          onClick={() => addToCart(item)}
                          className="h-9 w-9 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Cart */}
            <div className="flex w-full flex-col bg-muted/20 md:w-[380px] lg:w-[410px]">
              <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Current sale
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                      Cart
                    </h3>
                  </div>

                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {cart.length} items
                  </span>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1 px-4 py-4 sm:px-6">
                {cart.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-foreground">
                      Cart is empty
                    </p>

                    <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                      Select products from the inventory list to add them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((cartItem) => (
                      <div
                        key={cartItem.id}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {cartItem.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              ₱{cartItem.sellingPrice.toFixed(2)} each
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-semibold text-foreground">
                            ₱
                            {(
                              cartItem.sellingPrice *
                              cartItem.quantity
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-md border border-border bg-background">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              onClick={() =>
                                updateQty(cartItem.id, -1)
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>

                            <span className="w-8 text-center text-xs font-medium">
                              {cartItem.quantity}
                            </span>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              onClick={() =>
                                updateQty(cartItem.id, 1)
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            onClick={() =>
                              removeFromCart(cartItem.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-border bg-card p-4 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total
                    </span>

                    <span className="text-xl font-semibold tracking-tight text-foreground">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment received
                    </label>

                    <div className="relative">
                      <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        type="number"
                        placeholder="Enter payment"
                        value={payment || ''}
                        onChange={(e) =>
                          setPayment(
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-11 rounded-md pl-9 text-base md:h-9 md:text-sm"
                      />
                    </div>
                  </div>

                  {payment > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">
                        Change
                      </span>

                      <span
                        className={
                          change >= 0
                            ? 'text-sm font-semibold text-emerald-600'
                            : 'text-sm font-semibold text-red-600'
                        }
                      >
                        ₱{change.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={handleCheckout}
                    disabled={processing || cart.length === 0}
                    className="h-11 w-full rounded-md text-sm font-semibold md:h-10"
                  >
                    {processing ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PosHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}