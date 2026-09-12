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
  ArrowRight,
  CircleDot,
  History,
  UserRound,
} from 'lucide-react';

function formatDateTime(
  value: any
) {
  if (!value) {
    return 'Unknown time';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(
      value
    );
  }

  return date.toLocaleString(
    'en-PH',
    {
      dateStyle:
        'medium',
      timeStyle:
        'short',
    }
  );
}

function formatStatus(
  value: any
) {
  if (!value) {
    return null;
  }

  return String(
    value
  ).replace(
    /_/g,
    ' '
  );
}

function getReason(
  metadata: any
) {
  if (
    !metadata ||
    typeof metadata !==
      'object'
  ) {
    return null;
  }

  return (
    metadata.reason ||
    metadata.declineReason ||
    metadata.rejectionReason ||
    metadata.cancelReason ||
    null
  );
}

function getAdditionalMetadata(
  metadata: any
) {
  if (
    !metadata ||
    typeof metadata !==
      'object'
  ) {
    return [];
  }

  const ignored =
    new Set([
      'reason',
      'declineReason',
      'rejectionReason',
      'cancelReason',
    ]);

  return Object.entries(
    metadata
  ).filter(
    ([key]) =>
      !ignored.has(key)
  );
}

export default function AppointmentHistoryCard({
  history,
}: {
  history: any[];
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Appointment History
                </h3>

                <p className="text-xs text-muted-foreground">
                  Every recorded appointment status transition
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
            >
              {history.length}
            </Badge>
          </div>
        </div>

        {history.length ===
        0 ? (
          <div className="px-5 py-10 text-center">
            <CircleDot className="mx-auto h-6 w-6 text-muted-foreground/50" />

            <p className="mt-2 text-xs text-muted-foreground">
              No status history has been recorded for this appointment.
            </p>
          </div>
        ) : (
          <div className="relative p-4 sm:p-5">
            <div className="absolute bottom-9 left-[34px] top-9 w-px bg-border" />

            <div className="relative space-y-4">
              {history.map(
                (
                  log,
                  index
                ) => {
                  const fromStatus =
                    formatStatus(
                      log?.fromStatus
                    );

                  const toStatus =
                    formatStatus(
                      log?.toStatus
                    );

                  const reason =
                    getReason(
                      log?.metadata
                    );

                  const metadataEntries =
                    getAdditionalMetadata(
                      log?.metadata
                    );

                  return (
                    <div
                      key={
                        log?.id ||
                        index
                      }
                      className="relative flex gap-3"
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                        <CircleDot className="h-3.5 w-3.5 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {fromStatus && (
                              <Badge
                                variant="outline"
                                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                              >
                                {
                                  fromStatus
                                }
                              </Badge>
                            )}

                            {fromStatus &&
                              toStatus && (
                                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                              )}

                            {toStatus && (
                              <Badge
                                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                              >
                                {
                                  toStatus
                                }
                              </Badge>
                            )}
                          </div>

                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDateTime(
                              log?.createdAt
                            )}
                          </span>
                        </div>

                        {reason && (
                          <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Reason
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">
                              {reason}
                            </p>
                          </div>
                        )}

                        {log?.staff && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5 text-primary" />

                            <span className="font-semibold text-foreground">
                              {
                                log.staff
                                  .fullname
                              }
                            </span>

                            {log.staff
                              .username && (
                              <span>
                                @
                                {
                                  log
                                    .staff
                                    .username
                                }
                              </span>
                            )}
                          </div>
                        )}

                        {log?.changedBy && (
                          <p className="mt-2 break-all font-mono text-[9px] text-muted-foreground">
                            Staff ID: {
                              log.changedBy
                            }
                          </p>
                        )}

                        {metadataEntries.length >
                          0 && (
                          <div className="mt-3 rounded-md border border-border bg-card p-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Additional Details
                            </p>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {metadataEntries.map(
                                ([
                                  key,
                                  value,
                                ]) => (
                                  <div
                                    key={
                                      key
                                    }
                                    className="min-w-0"
                                  >
                                    <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {key.replace(
                                        /([A-Z])/g,
                                        ' $1'
                                      )}
                                    </p>

                                    <p className="mt-0.5 break-words text-[11px] text-foreground">
                                      {typeof value ===
                                      'object'
                                        ? JSON.stringify(
                                            value
                                          )
                                        : String(
                                            value
                                          )}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}