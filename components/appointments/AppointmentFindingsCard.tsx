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
  FileSearch,
  Package,
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

export default function AppointmentFindingsCard({
  findings,
  enabled,
}: {
  findings: any[];
  enabled: boolean;
}) {
  return (
    <Card
      className={[
        'overflow-hidden rounded-xl border-border bg-card shadow-sm',
        !enabled &&
          'opacity-50',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CardContent className="p-0">
        {findings.length ===
        0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No findings have been recorded for this appointment.
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            {findings.map(
              (
                finding,
                index
              ) => (
                <div
                  key={
                    finding?.id ||
                    index
                  }
                  className="overflow-hidden rounded-lg border border-border bg-background"
                >
                  <div className="flex items-start gap-3 border-b border-border p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileSearch className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Finding
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-foreground">
                        {finding?.description ||
                          'No description'}
                      </p>
                    </div>
                  </div>

                  {finding?.parts?.length >
                    0 && (
                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Attached Items
                        </p>

                        <Badge
                          variant="secondary"
                          className="rounded-full px-2 py-0.5 text-[9px]"
                        >
                          {
                            finding
                              .parts
                              .length
                          }
                        </Badge>
                      </div>

                      <div className="space-y-2">
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
                              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {part?.quantity ||
                                    1}
                                  x
                                </span>

                                <span className="truncate text-xs font-medium text-foreground">
                                  {part?.partName ||
                                    'Part'}
                                </span>

                                {part?.isPms && (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700"
                                  >
                                    PMS
                                  </Badge>
                                )}
                              </div>

                              <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
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
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}