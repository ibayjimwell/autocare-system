'use client';

import React, { useState } from 'react';

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
  CheckCircle2,
  DollarSign,
  Loader2,
  Printer,
} from 'lucide-react';

import { toast } from 'sonner';

interface CashierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: any;
  onPaid: (referenceNumber: string) => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function CashierModal({
  open,
  onOpenChange,
  bill,
  onPaid,
}: CashierModalProps) {
  const [paymentAmount, setPaymentAmount] =
    useState<string>('');
  const [isProcessing, setIsProcessing] =
    useState(false);

  const totalAmount = bill?.grandTotal
    ? parseFloat(bill.grandTotal)
    : 0;

  const payment =
    parseFloat(paymentAmount) || 0;

  const change = payment - totalAmount;

  const handlePay = async () => {
    if (payment < totalAmount) {
      toast.error('Insufficient payment amount.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(
        `/api/payments/final-bills/${bill.id}/pay`,
        {
          method: 'POST',
        }
      );

      const data = await res.json();

      if (data.error) {
        toast.error(
          data.errorMessage || 'Payment failed.'
        );
      } else {
        toast.success(
          'Payment successful! Receipt generated.'
        );

        onPaid(data.data.referenceNumber);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(
        err.message || 'Error processing payment.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100%-1rem)] rounded-xl border border-border
          bg-card shadow-2xl sm:max-w-md
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <DollarSign className="h-5 w-5 text-primary" />
            Cashier
          </DialogTitle>

          <DialogDescription>
            Complete payment and generate receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border border-primary/15 bg-primary/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bill
            </p>

            <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
              ₱{totalAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Payment (₱)
            </Label>

            <Input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(e.target.value)
              }
              placeholder="0.00"
              className={`h-12 rounded-md text-base font-semibold md:text-lg ${focusClass}`}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[totalAmount, totalAmount + 100, totalAmount + 500].map(
              (amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className={`h-11 rounded-md px-2 md:h-9 ${focusClass}`}
                  onClick={() =>
                    setPaymentAmount(amount.toFixed(2))
                  }
                >
                  ₱{amount.toFixed(0)}
                </Button>
              )
            )}
          </div>

          {payment > 0 && (
            <div
              className={`
                rounded-lg border p-3
                ${
                  change >= 0
                    ? 'border-green-200 bg-green-50'
                    : 'border-destructive/20 bg-destructive/5'
                }
              `}
            >
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>Change</span>

                <span
                  className={
                    change >= 0
                      ? 'text-green-600'
                      : 'text-red-500'
                  }
                >
                  ₱{change.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handlePay}
            disabled={
              isProcessing || payment < totalAmount
            }
            className={`h-11 w-full rounded-md px-5 md:h-9 md:w-auto ${focusClass}`}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}

            {isProcessing
              ? 'Processing...'
              : 'Confirm Payment & Print Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}