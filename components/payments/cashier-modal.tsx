'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Receipt, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CashierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: any; // FinalBill object
  onPaid: (referenceNumber: string) => void;
}

export default function CashierModal({ open, onOpenChange, bill, onPaid }: CashierModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = bill?.grandTotal ? parseFloat(bill.grandTotal) : 0;
  const payment = parseFloat(paymentAmount) || 0;
  const change = payment - totalAmount;

  const handlePay = async () => {
    if (payment < totalAmount) {
      toast.error('Insufficient payment amount.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payments/final-bills/${bill.id}/pay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.errorMessage || 'Payment failed.');
      } else {
        toast.success('Payment successful! Receipt generated.');
        onPaid(data.data.referenceNumber);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <DollarSign className="h-5 w-5 text-primary" /> Cashier
          </DialogTitle>
          <DialogDescription>Complete payment and generate receipt</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total */}
          <div className="bg-muted/20 p-4 rounded-xl">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Bill</span>
              <span className="text-lg font-black text-primary">₱{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Payment (₱)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 text-lg font-bold"
              autoFocus
            />
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {[totalAmount, totalAmount + 100, totalAmount + 500].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPaymentAmount(amount.toFixed(2))}
              >
                ₱{amount.toFixed(0)}
              </Button>
            ))}
          </div>

          {payment > 0 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-xl">
              <div className="flex justify-between text-sm font-bold">
                <span>Change</span>
                <span className={change >= 0 ? 'text-green-600' : 'text-red-500'}>
                  ₱{change.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handlePay}
            disabled={isProcessing || payment < totalAmount}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? 'Processing...' : 'Confirm Payment & Print Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}