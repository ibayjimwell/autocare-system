// components/inventory/pos-modal.tsx
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt } from 'lucide-react';
import { useInventory } from '@/hooks/inventory/use-inventory';
import { posApi } from '@/lib/inventory/inventory';
import { toast } from 'sonner';
import { formatCurrency } from '@/app-utils/inventory/inventory';
import PosHistoryModal from './pos-history-modal';

export default function POSModal({ open, onClose, onCompleted }: { open: boolean; onClose: () => void; onCompleted: () => void }) {
  const { items, search, setSearch } = useInventory(true); // fetch all for POS
  const [cart, setCart] = useState<{ id: string; name: string; sellingPrice: number; quantity: number }[]>([]);
  const [payment, setPayment] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const addToCart = (item: any) => {
    if (item.quantity <= 0) { toast.error("Out of stock"); return; }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > item.quantity) { toast.error("Not enough stock"); return prev; }
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { id: item.id, name: item.name, sellingPrice: parseFloat(item.sellingPrice), quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantity + delta;
      if (newQty < 1) return i;
      return { ...i, quantity: newQty };
    }).filter(i => i.quantity > 0));
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
  const change = payment - totalAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (payment < totalAmount) { toast.error("Insufficient payment"); return; }
    setProcessing(true);
    const res = await posApi.createTransaction({ items: cart, paymentReceived: payment });
    if (res.error) toast.error(res.errorMessage);
    else {
      toast.success("Sale completed!");
      onCompleted();
      onClose();
    }
    setProcessing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col rounded-3xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="font-black flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Point of Sale
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <Receipt className="w-4 h-4 mr-2" /> History
            </Button>
          </DialogHeader>
          <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
            {/* Product list */}
            <div className="flex-1">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search product..."
                  className="pl-10 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[350px]">
                <div className="grid grid-cols-2 gap-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 border rounded-lg hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{item.name}</p>
                        <p className="text-xs">₱{parseFloat(item.sellingPrice).toFixed(2)} | Qty: {item.quantity}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addToCart(item)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Cart */}
            <div className="w-full md:w-96 flex flex-col">
              <h4 className="font-bold mb-2">Cart</h4>
              <ScrollArea className="flex-1 max-h-[300px]">
                <div className="space-y-2">
                  {cart.map(cartItem => (
                    <div key={cartItem.id} className="flex items-center justify-between text-sm border-b pb-1">
                      <div className="flex-1">
                        <p className="font-medium truncate">{cartItem.name}</p>
                        <p className="text-xs">₱{cartItem.sellingPrice.toFixed(2)} x {cartItem.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(cartItem.id, -1)}><Minus className="w-3 h-3" /></Button>
                        <span className="w-6 text-center">{cartItem.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(cartItem.id, 1)}><Plus className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(cartItem.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="flex justify-between font-bold"><span>Total</span><span>₱{totalAmount.toFixed(2)}</span></div>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Payment" value={payment || ''} onChange={(e) => setPayment(parseFloat(e.target.value) || 0)} className="rounded-xl" />
                  <Button onClick={handleCheckout} disabled={processing || cart.length === 0} className="w-24">
                    {processing ? "..." : "Pay"}
                  </Button>
                </div>
                {payment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Change</span>
                    <span className="font-bold text-green-600">₱{change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PosHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}