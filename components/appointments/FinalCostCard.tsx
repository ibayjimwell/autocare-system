'use client';

import React from 'react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Badge,
} from '@/components/ui/badge';

import {
  CheckCircle2,
  ReceiptText,
} from 'lucide-react';

function money(
  value: any
) {
  return `₱${(
    Number(value) || 0
  ).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    }
  )}`;
}

export default function FinalCostCard({
  finalBill,
  enabled,
}: {
  finalBill: any;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <Card className="rounded-xl border-border bg-card opacity-50 shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            The final bill is available after the appointment is completed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!finalBill) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-6 text-center">
          <ReceiptText className="mx-auto h-6 w-6 text-muted-foreground/50" />

          <p className="mt-2 text-sm font-medium text-foreground">
            No final bill available
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            A final bill has not been generated for this appointment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const status =
    String(
      finalBill?.status ||
        'PENDING'
    ).toUpperCase();

  const isPaid =
    status ===
    'PAID';

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ReceiptText className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Final Bill
              </h3>

              <p className="text-xs text-muted-foreground">
                Final cost and payment status
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase"
          >
            {String(
              finalBill.status ||
                'PENDING'
            ).replace(
              /_/g,
              ' '
            )}
          </Badge>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bill ID
              </p>

              <p className="mt-2 break-all font-mono text-xs font-semibold text-foreground">
                {finalBill.id ||
                  'N/A'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Estimate ID
              </p>

              <p className="mt-2 break-all font-mono text-xs font-semibold text-foreground">
                {finalBill.estimateId ||
                  finalBill.estimate?.id ||
                  'N/A'}
              </p>
            </div>
          </div>

          {finalBill?.findings?.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Final Bill Findings
              </p>

              <div className="space-y-2">
                {finalBill.findings.map(
                  (
                    finding: any,
                    index: number
                  ) => (
                    <div
                      key={
                        finding?.id ||
                        index
                      }
                      className="rounded-md bg-muted/30 p-3"
                    >
                      <p className="text-xs font-medium text-foreground">
                        {finding?.description ||
                          'Finding'}
                      </p>

                      {finding?.parts?.length >
                        0 && (
                        <div className="mt-2 space-y-1.5">
                          {finding.parts.map(
                            (
                              part: any,
                              partIndex: number
                            ) => (
                              <div
                                key={
                                  part?.id ||
                                  partIndex
                                }
                                className="flex items-center justify-between gap-3 rounded-md bg-card px-2.5 py-2"
                              >
                                <span className="text-xs text-muted-foreground">
                                  {part?.quantity ||
                                    1}
                                  x{' '}
                                  {
                                    part?.partName
                                  }
                                </span>

                                <span className="font-mono text-xs font-semibold">
                                  {money(
                                    (Number(
                                      part?.priceAtTime
                                    ) ||
                                      0) *
                                      (Number(
                                        part?.quantity
                                      ) ||
                                        1)
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {finalBill?.fees?.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Final Bill Fees
              </p>

              <div className="space-y-2">
                {finalBill.fees.map(
                  (
                    fee: any,
                    index: number
                  ) => (
                    <div
                      key={
                        fee?.id ||
                        index
                      }
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-xs">
                        {fee?.title ||
                          'Fee'}
                      </span>

                      <span className="font-mono text-xs font-semibold">
                        {money(
                          fee?.amount
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-primary/5 p-5 ring-1 ring-primary/10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Final Total
                </p>

                <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-primary">
                  {money(
                    finalBill.grandTotal
                  )}
                </p>
              </div>

              {isPaid && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />

                  Paid
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}