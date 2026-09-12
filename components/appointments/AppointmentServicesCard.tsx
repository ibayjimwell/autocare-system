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
  Clock3,
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

function duration(
  value: any
) {
  const minutes =
    Number(value) || 0;

  if (
    minutes < 60
  ) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainder =
    minutes % 60;

  if (
    remainder ===
    0
  ) {
    return `${hours} ${
      hours === 1
        ? 'hour'
        : 'hours'
    }`;
  }

  return `${hours}h ${remainder}m`;
}

export default function AppointmentServicesCard({
  services,
}: {
  services: any[];
}) {
  const total =
    services.reduce(
      (
        sum,
        service
      ) =>
        sum +
        (Number(
          service?.basePrice
        ) || 0),
      0
    );

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        {services.length ===
        0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No service details are currently available.
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {services.map(
                (
                  service,
                  index
                ) => (
                  <div
                    key={
                      service?.id ||
                      index
                    }
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Wrench className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">
                            {service?.name ||
                              'Service'}
                          </h4>

                          {service?.type && (
                            <Badge
                              variant="outline"
                              className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                            >
                              {
                                service.type
                              }
                            </Badge>
                          )}
                        </div>

                        {service?.description && (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {
                              service.description
                            }
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />

                          {duration(
                            service?.estimatedDuration ??
                              service?.durationMinutes
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 font-mono text-sm font-semibold text-foreground">
                      {money(
                        service?.basePrice
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-primary/5 px-4 py-4 sm:px-5">
              <span className="text-xs font-semibold text-foreground">
                Base Service Total
              </span>

              <span className="font-mono text-lg font-bold text-primary">
                {money(
                  total
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}