'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Barcode,
  Camera,
  CheckCircle2,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  ScanLine,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentsPosApi } from '@/lib/payments/pos';
import { inventoryApi } from '@/lib/inventory/inventory';
import InventoryPicker from '@/components/inventory/inventory-picker';
import BarcodeScannerModal from '@/components/inventory/barcode-scanner-modal';
import BarcodeNotFoundModal from '@/components/inventory/barcode-not-found-modal';
import PosHistoryModal from '@/components/payments/pos-history-modal';
import PosReceiptModal, { type PosReceiptTransaction } from '@/components/payments/pos-receipt-modal';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import {
  formatCashierAmount,
  getCashierPaymentChoices,
  parseCashierPaymentInput,
} from '@/app-utils/payments/cashier';

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

interface SelectedInventoryItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  unit?: string | null;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * POS deliberately uses the existing inventory lookup and transaction APIs.
 * Scanning only adds a cart line. Stock is deducted by the existing POS API
 * after successful payment; no stock writes happen during scanning.
 */
export default function POSModal({ open, onClose, onCompleted }: POSModalProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentReceived, setPaymentReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<PosReceiptTransaction | null>(null);
  const checkoutIdRef = useRef<string | null>(null);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const scanningRef = useRef(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
    [cart],
  );
  const totalInCents = Math.round(total * 100);
  const payment = parseCashierPaymentInput(paymentReceived);
  const changeInCents = Math.round(payment * 100) - totalInCents;
  const canPay = totalInCents > 0 && changeInCents >= 0;
  const hasPayment = paymentReceived.trim().length > 0;
  const paymentChoices = useMemo(() => getCashierPaymentChoices(total), [total]);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = useCallback((selected: SelectedInventoryItem) => {
    checkoutIdRef.current = null;
    const stock = Number(selected.quantity) || 0;
    const sellingPrice = Number(selected.price);
    if (stock <= 0) {
      toast.error(`${selected.name} is out of stock.`);
      return;
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      toast.error(`Invalid selling price for ${selected.name}.`);
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
            sellingPrice,
            stock,
            unit: selected.unit || undefined,
          },
        ];
      }
      // Refresh the stock snapshot each time we scan. The server still
      // performs the authoritative check at checkout.
      const latestStock = stock;
      if (existing.quantity >= latestStock) {
        toast.error(`Only ${latestStock} ${selected.unit || 'unit'} available for ${selected.name}.`);
        return current.map((item) => item.id === selected.id ? { ...item, stock: latestStock } : item);
      }
      return current.map((item) =>
        item.id === selected.id
          ? { ...item, quantity: item.quantity + 1, stock: latestStock, sellingPrice, unit: selected.unit || undefined }
          : item,
      );
    });
  }, []);

  const scanBarcode = useCallback(async (rawBarcode: string) => {
    const barcode = String(rawBarcode || '').trim();
    if (!barcode || scanningRef.current || loading) return;
    scanningRef.current = true;
    setBarcodeLoading(true);
    try {
      const result = await inventoryApi.lookupBarcode(barcode);
      if (result?.error) {
        if (result.errorType === 'not_found') {
          setBarcodeNotFound(barcode);
        } else {
          toast.error(result.errorMessage || 'Could not look up the scanned barcode.');
        }
        return;
      }
      const item = result?.data;
      if (!item?.id) {
        toast.error('Barcode lookup returned an invalid inventory item.');
        return;
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        toast.error(`${item.name} is out of stock and cannot be added to the POS cart.`);
        return;
      }
      addItem({
        id: item.id,
        name: item.name,
        quantity,
        price: Number(item.sellingPrice ?? item.costPrice ?? 0),
        unit: item.unit,
      });
      setBarcodeInput('');
      // A hardware scanner typically sends Enter after its barcode. Restore
      // input focus so several different products can be scanned in a row.
      requestAnimationFrame(() => barcodeInputRef.current?.focus());
    } catch (error: any) {
      console.error('[POS] Barcode lookup failed:', error);
      toast.error(error?.message || 'Unable to look up this barcode.');
    } finally {
      scanningRef.current = false;
      setBarcodeLoading(false);
    }
  }, [addItem, loading]);

  const handleCameraDetected = useCallback((barcode: string) => {
    setScannerOpen(false);
    setBarcodeInput(barcode);
    void scanBarcode(barcode);
  }, [scanBarcode]);

  const updateQuantity = (id: string, nextQuantity: number) => {
    checkoutIdRef.current = null;
    setCart((current) => current.map((item) => {
      if (item.id !== id) return item;
      const quantity = Math.min(Math.max(1, nextQuantity), item.stock);
      return { ...item, quantity };
    }));
  };

  const removeItem = (id: string) => {
    checkoutIdRef.current = null;
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const reset = () => {
    checkoutIdRef.current = null;
    setCart([]);
    setPaymentReceived('');
    setBarcodeInput('');
    setBarcodeNotFound(null);
  };

  const openInventoryToAdd = (withBarcode: boolean) => {
    const params = new URLSearchParams();
    params.set('source', 'pos');
    if (withBarcode && barcodeNotFound) {
      params.set('addBarcode', barcodeNotFound);
    } else {
      params.set('addManual', '1');
    }
    setBarcodeNotFound(null);
    onClose();
    router.push(`/inventory?${params.toString()}`);
  };

  const handleComplete = async () => {
    if (loading) return;
    if (totalInCents <= 0) {
      toast.error('Add at least one item to the cart.');
      return;
    }
    if (!canPay) {
      toast.error('Insufficient payment amount.');
      return;
    }
    setLoading(true);
    try {
      // Reuse this checkout ID if the network loses the response after commit.
      // The server returns the same saved receipt without deducting stock twice.
      checkoutIdRef.current ||= (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);
      const result = await paymentsPosApi.createTransaction({
        transactionId: checkoutIdRef.current || undefined,
        items: cart.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity })),
        paymentReceived: payment,
      });
      if (result?.error) {
        toast.error(result.errorMessage || 'Transaction failed.');
        return;
      }
      if (!result?.data?.id) {
        toast.error('The server did not return a saved transaction. Open POS History to verify this sale before retrying.');
        return;
      }
      // Render the receipt from the committed DB row, not the temporary cart.
      setReceiptTransaction(result.data as PosReceiptTransaction);
      toast.success(result.alreadyRecorded ? 'This sale was already recorded; displaying the saved receipt.' : 'POS sale saved. Receipt is ready.');
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
          if (!nextOpen && !loading && !scannerOpen && !barcodeNotFound) onClose();
        }}
      >
        <DialogContent
          className="!flex !h-[calc(100dvh-1rem)] !max-h-[920px] !w-[calc(100vw-1rem)] !max-w-[1240px] !min-w-0 !flex-col !gap-0 !overflow-hidden !rounded-2xl !p-0 sm:!h-[min(90dvh,900px)] sm:!w-[calc(100vw-2rem)]"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 pr-5">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                  <ShoppingCart className="h-5 w-5 shrink-0 text-primary" />
                  Point of Sale
                </DialogTitle>
                <DialogDescription className="mt-1 max-w-2xl text-left">
                  Scan products, sell inventory, and deduct stock only after completing payment.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryOpen(true)}
                disabled={loading}
                className={`h-10 shrink-0 rounded-md ${focusClass}`}
              >
                <History className="mr-2 h-4 w-4" />History
              </Button>
            </div>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] lg:items-start">
              <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products</p>
                    <p className="mt-1 text-sm text-muted-foreground">Scan a barcode or search inventory to add products.</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative min-w-0">
                    <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={barcodeInputRef}
                      value={barcodeInput}
                      onChange={(event) => setBarcodeInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'Tab') {
                          if (barcodeInput.trim()) {
                            event.preventDefault();
                            void scanBarcode(barcodeInput);
                          }
                        }
                      }}
                      disabled={loading || barcodeLoading}
                      placeholder="Scan or type barcode, then press Enter"
                      aria-label="POS barcode input"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-11 min-w-0 rounded-lg pl-10 pr-11 text-sm"
                    />
                    {barcodeLoading && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" />}
                  </div>
                  <Button
                    type="button"
                    onClick={() => void scanBarcode(barcodeInput)}
                    disabled={loading || barcodeLoading || !barcodeInput.trim()}
                    className={`h-11 rounded-lg px-4 ${focusClass}`}
                  >
                    {barcodeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                    Add by Barcode
                  </Button>
                </div>
                <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScannerOpen(true)}
                    disabled={loading || barcodeLoading}
                    className={`h-10 rounded-lg ${focusClass}`}
                  >
                    <Camera className="mr-2 h-4 w-4" />Scan with Camera
                  </Button>
                  <InventoryPicker onSelect={addItem} context="pos" className="h-10 rounded-lg">
                    <Plus className="mr-2 h-4 w-4" />Pick Inventory Item
                  </InventoryPicker>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  USB/Bluetooth barcode scanners work in the barcode field. Scan the next item after each lookup finishes.
                </p>

                <div className="mt-5 flex items-center justify-between border-b border-border pb-2">
                  <p className="text-sm font-semibold text-foreground">Cart</p>
                  <span className="text-xs text-muted-foreground">{totalUnits} {totalUnits === 1 ? 'unit' : 'units'}</span>
                </div>
                <div className="mt-3 min-w-0 space-y-2">
                  {cart.length === 0 ? (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><ShoppingCart className="h-5 w-5 text-muted-foreground" /></div>
                      <p className="mt-3 text-sm font-semibold">Cart is empty</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Scan a barcode or choose an inventory item to begin a sale.</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="min-w-0 rounded-xl border border-border bg-background p-3 sm:p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold leading-5 text-foreground">{item.name}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              ₱{formatCurrency(item.sellingPrice)} each · {item.stock} {item.unit || 'unit'} available
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => removeItem(item.id)}
                            disabled={loading}
                            className={`h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive ${focusClass}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={loading || item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`}><Minus className="h-4 w-4" /></Button>
                            <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={loading || item.quantity >= item.stock} onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`}><Plus className="h-4 w-4" /></Button>
                          </div>
                          <span className="break-words text-base font-semibold text-primary">₱{formatCurrency(item.sellingPrice * item.quantity)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-5 lg:sticky lg:top-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><WalletCards className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">Collect cash and complete the sale.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sale</p>
                  <p className="mt-1 break-words text-2xl font-bold tracking-tight text-primary sm:text-3xl">₱{formatCurrency(total)}</p>
                </div>
                <div className="mt-4 space-y-2">
                  <label htmlFor="pos-payment" className="text-sm font-medium">Payment received (₱)</label>
                  <Input
                    id="pos-payment"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paymentReceived}
                    onChange={(event) => { checkoutIdRef.current = null; setPaymentReceived(event.target.value); }}
                    disabled={loading}
                    placeholder="Enter amount received"
                    className={`h-11 rounded-lg text-base ${focusClass}`}
                  />
                </div>
                {paymentChoices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Payment Amounts</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {paymentChoices.map((choice) => {
                        const selected = hasPayment && Math.abs(payment - choice.amount) < 0.005;
                        return (
                          <Button
                            key={choice.amount}
                            type="button"
                            variant={selected ? 'default' : 'outline'}
                            onClick={() => { checkoutIdRef.current = null; setPaymentReceived(choice.amount.toFixed(2)); }}
                            disabled={loading}
                            className={`h-auto min-h-14 min-w-0 rounded-lg px-2 py-2 ${focusClass}`}
                          >
                            <span className="flex min-w-0 flex-col items-center gap-0.5 text-center">
                              <span className="break-all text-sm font-semibold tabular-nums">₱{formatCashierAmount(choice.amount)}</span>
                              <span className={`text-[10px] font-normal ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {choice.isExact ? 'Exact amount' : `Change ₱${formatCashierAmount(choice.change)}`}
                              </span>
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Exact amount is always included. Other choices round up using Philippine peso denominations ₱1, ₱5, ₱10, ₱20, ₱50, ₱100, ₱200, ₱500, and ₱1,000.
                    </p>
                  </div>
                )}
                <div className={`mt-4 rounded-xl border p-4 ${canPay ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {canPay ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Banknote className="h-4 w-4 shrink-0 text-primary" />}
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{hasPayment && !canPay ? 'Amount Remaining' : 'Change'}</span>
                    </div>
                    <span className={`break-words text-right text-lg font-bold tabular-nums ${canPay ? 'text-emerald-600' : 'text-foreground'}`}>
                      ₱{formatCurrency(hasPayment && !canPay ? Math.max(-changeInCents, 0) / 100 : Math.max(changeInCents, 0) / 100)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-3 sm:flex-row sm:p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              disabled={loading}
              className={`h-11 w-full rounded-lg sm:w-auto ${focusClass}`}
            >
              <X className="mr-2 h-4 w-4" />Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleComplete()}
              disabled={loading || !canPay}
              className={`h-11 w-full rounded-lg px-5 sm:w-auto ${focusClass}`}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              {loading ? 'Processing Sale…' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleCameraDetected}
        title="POS Barcode Scanner"
        description="Scan a registered inventory barcode to add one unit to the POS cart."
      />
      <BarcodeNotFoundModal
        open={Boolean(barcodeNotFound)}
        barcode={barcodeNotFound || ''}
        onOpenChange={(nextOpen) => { if (!nextOpen) setBarcodeNotFound(null); }}
        onAddManual={() => openInventoryToAdd(false)}
        onAddWithBarcode={() => openInventoryToAdd(true)}
      />
      <PosHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <PosReceiptModal
        open={Boolean(receiptTransaction)}
        transaction={receiptTransaction}
        onOpenChange={(nextOpen) => { if (!nextOpen) setReceiptTransaction(null); }}
      />
    </>
  );
}
