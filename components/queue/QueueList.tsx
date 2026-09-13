'use client';

import React from 'react';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
} from '@/components/ui/card';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Play,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

import ServiceCard from '@/components/services/service-card';

interface QueueListProps {
  queue: any[];
  loading: boolean;
  onStartInspection: (
    appointmentId: string,
  ) => void;
}

export default function QueueList({
  queue,
  loading,
  onStartInspection,
}: QueueListProps) {
  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-border bg-background">
        <div className="text-sm text-muted-foreground">
          Loading queue...
        </div>
      </div>
    );
  }

  /* ==============================================================
     EMPTY
  ============================================================== */

  if (
    queue.length ===
    0
  ) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Play className="h-5 w-5 text-muted-foreground" />
        </div>

        <p className="text-sm font-semibold text-foreground">
          No confirmed appointments
        </p>

        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          There are no confirmed appointments waiting in today&apos;s service queue.
        </p>
      </div>
    );
  }

  /* ==============================================================
     QUEUE
  ============================================================== */

  return (
    <div className="space-y-3">
      {queue.map(
        (
          item,
          index,
        ) => {
          /*
           * The API is authoritative.
           *
           * queueNumber is supplied by the API based on the current
           * queue ordering. The fallback index keeps the UI safe if
           * a response does not contain queueNumber.
           */
          const queueNumber =
            item.queueNumber ??
            index + 1;

          return (
            <Card
              key={
                item.queueId ||
                item.appointmentId
              }
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
                'transition-shadow hover:shadow-md',
              )}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                {/* ==================================================
                    QUEUE NUMBER
                ================================================== */}

                <div className="flex shrink-0 items-center gap-4">
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-xl
                      bg-primary/10
                      text-primary
                    "
                    aria-label={`Queue number ${queueNumber}`}
                  >
                    <span className="text-2xl font-black tracking-tight">
                      {queueNumber}
                    </span>
                  </div>

                  <div className="sm:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {item.customer?.fullname ||
                          'Customer'}
                      </span>

                      <Badge
                        variant="outline"
                        className="rounded-md"
                      >
                        {item.vehicle?.plateNumber ||
                          'N/A'}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Appointment at{' '}
                      <span className="font-medium text-foreground">
                        {item.appointmentTime}
                      </span>
                    </p>
                  </div>
                </div>

                {/* ==================================================
                    APPOINTMENT INFORMATION
                ================================================== */}

                <div className="min-w-0 flex-1">
                  <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    <span className="text-sm font-bold text-foreground">
                      {item.customer?.fullname ||
                        'Customer'}
                    </span>

                    <Badge
                      variant="outline"
                      className="rounded-md"
                    >
                      {item.vehicle?.plateNumber ||
                        'N/A'}
                    </Badge>
                  </div>

                  <div className="mt-1 hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                    <span>
                      Scheduled for
                    </span>

                    <span className="font-semibold text-foreground">
                      {item.appointmentTime}
                    </span>

                    {item.trackingNumber && (
                      <>
                        <span>
                          •
                        </span>

                        <span>
                          {item.trackingNumber}
                        </span>
                      </>
                    )}
                  </div>

                  {/* ==================================================
                      SERVICES
                  ================================================== */}

                  {Array.isArray(
                    item.services,
                  ) &&
                  item.services.length >
                    0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.services.map(
                        (
                          serviceId: string,
                        ) => (
                          <ServiceCard
                            key={
                              serviceId
                            }
                            serviceId={
                              serviceId
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No service information available.
                    </p>
                  )}
                </div>

                {/* ==================================================
                    ACTION
                ================================================== */}

                <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">
                  <Button
                    type="button"
                    className="
                      h-10
                      w-full
                      rounded-md
                      bg-primary
                      px-4
                      text-xs
                      font-semibold
                      text-white
                      hover:bg-primary/90
                      sm:w-auto
                    "
                    onClick={() =>
                      onStartInspection(
                        item.appointmentId,
                      )
                    }
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />

                    Inspect
                  </Button>
                </div>
              </div>
            </Card>
          );
        },
      )}
    </div>
  );
}