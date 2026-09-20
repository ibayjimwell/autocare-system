'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Button,
} from '@/components/ui/button';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  DollarSign,
  Loader2,
  Printer,
} from 'lucide-react';

import {
  toast,
} from 'sonner';

import {
  formatCashierAmount,
  getCashierPaymentChoices,
  parseCashierPaymentInput,
} from '@/app-utils/payments/cashier';

interface CashierModalProps {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  bill: any;
  onPaid: (
    referenceNumber: string,
  ) => void;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function CashierModal({
  open,
  onOpenChange,
  bill,
  onPaid,
}: CashierModalProps) {
  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState('');

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const totalAmount =
    bill?.grandTotal
      ? Number.parseFloat(
          String(
            bill.grandTotal,
          ),
        )
      : 0;

  const safeTotalAmount =
    Number.isFinite(
      totalAmount,
    ) && totalAmount > 0
      ? Math.round(
          totalAmount * 100,
        ) / 100
      : 0;

  const payment =
    parseCashierPaymentInput(
      paymentAmount,
    );

  const change =
    Math.round(
      (payment -
        safeTotalAmount) *
        100,
    ) / 100;

  const hasPayment =
    paymentAmount.trim()
      .length > 0;

  const isSufficient =
    payment >=
      safeTotalAmount &&
    safeTotalAmount > 0;

  const paymentChoices =
    useMemo(
      () =>
        getCashierPaymentChoices(
          safeTotalAmount,
        ),
      [safeTotalAmount],
    );

  useEffect(() => {
    if (!open) {
      setPaymentAmount('');
      setIsProcessing(false);
      return;
    }

    /*
     * Start every cashier session with an empty input so the cashier
     * can either select a suggested amount or type a custom amount.
     */
    setPaymentAmount('');
  }, [
    open,
    bill?.id,
  ]);

  const handlePay =
    async () => {
      if (
        safeTotalAmount <= 0
      ) {
        toast.error(
          'This final bill has an invalid total amount.',
        );

        return;
      }

      if (
        payment <
        safeTotalAmount
      ) {
        toast.error(
          'Insufficient payment amount.',
        );

        return;
      }

      setIsProcessing(
        true,
      );

      try {
        const res =
          await fetch(
            `/api/payments/final-bills/${bill.id}/pay`,
            {
              method: 'POST',
            },
          );

        /*
         * Keep the JSON handling safe so a non-JSON backend response
         * does not create a second parsing error.
         */
        const responseText =
          await res.text();

        let data: any = null;

        try {
          data =
            responseText
              ? JSON.parse(
                  responseText,
                )
              : null;
        } catch {
          throw new Error(
            'The payment server returned an invalid response.',
          );
        }

        if (
          !res.ok ||
          data?.error
        ) {
          toast.error(
            data?.errorMessage ||
              data?.message ||
              'Payment failed.',
          );

          return;
        }

        toast.success(
          'Payment successful! Receipt generated.',
        );

        onPaid(
          data?.data
            ?.referenceNumber ??
            '',
        );

        onOpenChange(
          false,
        );
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Error processing payment.',
        );
      } finally {
        setIsProcessing(
          false,
        );
      }
    };

  const handleSelectAmount =
    (
      amount: number,
    ) => {
      setPaymentAmount(
        amount.toFixed(2),
      );
    };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (
          isProcessing
        ) {
          return;
        }

        onOpenChange(
          nextOpen,
        );
      }}
    >
      <DialogContent
        className="
          flex
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-lg
          flex-col
          overflow-hidden
          rounded-2xl
          p-0
          sm:h-auto
          sm:max-h-[calc(100dvh-2rem)]
          sm:w-full
        "
      >
        {/* =========================================================
            HEADER
        ========================================================== */}

        <DialogHeader className="shrink-0 border-b border-border p-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <CircleDollarSign className="h-5 w-5 text-primary" />

            Cashier
          </DialogTitle>

          <DialogDescription>
            Complete payment and generate receipt.
          </DialogDescription>
        </DialogHeader>

        {/* =========================================================
            SCROLLABLE BODY
        ========================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            touch-pan-y
            [-webkit-overflow-scrolling:touch]
            px-5
            py-5
          "
        >
          <div className="space-y-5">

            {/* =====================================================
                TOTAL
            ====================================================== */}

            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Bill
                  </p>

                  <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
                    ₱
                    {formatCashierAmount(
                      safeTotalAmount,
                    )}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* =====================================================
                MANUAL PAYMENT INPUT
            ====================================================== */}

            <div className="space-y-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer Payment (₱)
                </Label>

                <span className="text-[11px] leading-4 text-muted-foreground sm:text-right">
                  Choose a common amount or type manually
                </span>
              </div>

              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={
                  paymentAmount
                }
                onChange={event =>
                  setPaymentAmount(
                    event.target.value,
                  )
                }
                placeholder="Enter customer payment"
                className={`h-12 rounded-md text-base font-semibold md:text-lg ${focusClass}`}
                autoFocus
              />
            </div>

            {/* =====================================================
                PAYMENT CHOICES
            ====================================================== */}

            {paymentChoices.length >
              0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 shrink-0 text-primary" />

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested Payment Amounts
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {paymentChoices.map(
                    choice => {
                      const selected =
                        Math.abs(
                          payment -
                            choice.amount,
                        ) <
                          0.005 &&
                        hasPayment;

                      return (
                        <Button
                          key={
                            choice.amount
                          }
                          type="button"
                          variant={
                            selected
                              ? 'default'
                              : 'outline'
                          }
                          className={`h-auto min-h-12 rounded-md px-3 py-2 ${focusClass}`}
                          onClick={() =>
                            handleSelectAmount(
                              choice.amount,
                            )
                          }
                        >
                          <span className="flex w-full flex-col items-center justify-center gap-0.5">
                            <span className="text-sm font-semibold sm:text-base">
                              ₱
                              {formatCashierAmount(
                                choice.amount,
                              )}
                            </span>

                            <span
                              className={`text-[10px] font-normal ${
                                selected
                                  ? 'text-primary-foreground/75'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {choice.isExact
                                ? 'Exact amount'
                                : `Change ₱${formatCashierAmount(
                                    choice.change,
                                  )}`}
                            </span>
                          </span>
                        </Button>
                      );
                    },
                  )}
                </div>

                <p className="text-[11px] leading-5 text-muted-foreground">
                  Exact amount is always included.
                  The other choices are the next practical
                  amounts based on Philippine peso denominations
                  ₱1, ₱5, ₱10, ₱20, ₱50, ₱100, ₱200,
                  ₱500, and ₱1,000.
                </p>
              </div>
            )}

            {/* =====================================================
                CHANGE / REMAINING
            ====================================================== */}

            {hasPayment && (
              <div
                className={`rounded-xl border p-4 ${
                  isSufficient
                    ? 'border-green-200 bg-green-50'
                    : 'border-destructive/20 bg-destructive/5'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {isSufficient ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <DollarSign className="h-5 w-5 shrink-0 text-red-500" />
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {isSufficient
                          ? 'Change'
                          : 'Amount Remaining'}
                      </p>

                      <p
                        className={
                          isSufficient
                            ? 'mt-0.5 text-xs text-green-700'
                            : 'mt-0.5 text-xs text-red-600'
                        }
                      >
                        Customer pays ₱
                        {formatCashierAmount(
                          payment,
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-xl font-bold tracking-tight ${
                      isSufficient
                        ? 'text-green-600'
                        : 'text-red-500'
                    }`}
                  >
                    ₱
                    {formatCashierAmount(
                      Math.abs(
                        change,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            FOOTER
        ========================================================== */}

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(
                false,
              )
            }
            disabled={
              isProcessing
            }
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={
              handlePay
            }
            disabled={
              isProcessing ||
              !isSufficient
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