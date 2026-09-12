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
  Receipt,
  Tag,
  Wrench,
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

export default function EstimateCostCard({
  estimate,
  enabled,
}: {
  estimate: any;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <Card className="rounded-xl border-border bg-card opacity-50 shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            Estimate information becomes available once the appointment reaches the estimate stage.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!estimate) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-6 text-center">
          <Receipt className="mx-auto h-6 w-6 text-muted-foreground/50" />

          <p className="mt-2 text-sm font-medium text-foreground">
            No estimate available
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            An estimate has not been generated for this appointment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const services =
    estimate?.appointment
      ?.services ||
    estimate?.services ||
    [];

  const findings =
    estimate?.findings ||
    [];

  const tasks =
    estimate?.tasks ||
    [];

  const fees =
    estimate?.fees ||
    [];

  const discounts =
    estimate?.discounts ||
    [];

  const serviceSubtotal =
    Number(
      estimate?.serviceSubtotal
    ) || 0;

  const findingsSubtotal =
    Number(
      estimate?.findingsSubtotal
    ) || 0;

  const feesTotal =
    Number(
      estimate?.feesTotal
    ) || 0;

  const discountTotal =
    Number(
      estimate?.discountTotal
    ) || 0;

  const grandTotal =
    estimate?.grandTotal !==
    undefined
      ? Number(
          estimate.grandTotal
        ) || 0
      : serviceSubtotal +
        findingsSubtotal +
        feesTotal -
        discountTotal;

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Estimated Cost
              </h3>

              <p className="text-xs text-muted-foreground">
                Read-only estimate
              </p>
            </div>
          </div>

          {estimate.status && (
            <Badge
              variant="outline"
              className="w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase"
            >
              {String(
                estimate.status
              ).replace(
                /_/g,
                ' '
              )}
            </Badge>
          )}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* SERVICES */}
          {services.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />

                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Services
                </p>
              </div>

              <div className="space-y-2">
                {services.map(
                  (
                    service: any,
                    index: number
                  ) => (
                    <div
                      key={
                        service?.id ||
                        index
                      }
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-xs text-foreground">
                        {
                          service?.name ||
                            service
                        }
                      </span>

                      <span className="font-mono text-xs font-semibold">
                        {money(
                          service?.basePrice
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-semibold">
                  Service Subtotal
                </span>

                <span className="font-mono text-sm font-bold text-primary">
                  {money(
                    serviceSubtotal
                  )}
                </span>
              </div>
            </div>
          )}

          {/* FINDINGS */}
          {findings.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Findings
              </p>

              <div className="space-y-3">
                {findings.map(
                  (
                    finding: any,
                    index: number
                  ) => (
                    <div
                      key={
                        finding?.id ||
                        index
                      }
                      className="rounded-md border border-border bg-muted/20 p-3"
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
                                  {part?.isPms
                                    ? '₱0.00'
                                    : money(
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

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-semibold">
                  Findings Subtotal
                </span>

                <span className="font-mono text-sm font-bold text-primary">
                  {money(
                    findingsSubtotal
                  )}
                </span>
              </div>
            </div>
          )}

          {/* TASKS */}
          {tasks.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Included Tasks
              </p>

              <div className="space-y-2">
                {tasks.map(
                  (
                    task: any,
                    index: number
                  ) => (
                    <div
                      key={
                        task?.id ||
                        index
                      }
                      className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />

                      <span className="flex-1 text-xs text-foreground">
                        {task?.title ||
                          task?.name ||
                          'Task'}
                      </span>

                      {task?.durationMinutes && (
                        <span className="text-[10px] text-muted-foreground">
                          {
                            task.durationMinutes
                          }{' '}
                          min
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* FEES */}
          {fees.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fees
              </p>

              <div className="space-y-2">
                {fees.map(
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
                      <span className="text-xs text-foreground">
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

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-semibold">
                  Fees Total
                </span>

                <span className="font-mono text-sm font-bold text-primary">
                  {money(
                    feesTotal
                  )}
                </span>
              </div>
            </div>
          )}

          {/* DISCOUNTS */}
          {discounts.length >
            0 && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Discounts
                </p>
              </div>

              <div className="space-y-2">
                {discounts.map(
                  (
                    discount: any,
                    index: number
                  ) => (
                    <div
                      key={
                        discount?.id ||
                        index
                      }
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-xs text-foreground">
                        {
                          discount?.title ||
                            'Discount'
                        }
                      </span>

                      <span className="font-mono text-xs font-semibold text-destructive">
                        -
                        {money(
                          discount?.amount
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* TOTAL */}
          <div className="rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimated Total
                </p>

                <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-primary">
                  {money(
                    grandTotal
                  )}
                </p>
              </div>

              <Receipt className="h-7 w-7 text-primary/50" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}