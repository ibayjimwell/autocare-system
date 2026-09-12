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
  CarFront,
  Clock3,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

export default function AppointmentQueueCard({
  queue,
  appointmentId,
  enabled,
}: {
  queue: any[];
  appointmentId: string;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm opacity-50">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            Queue information is available when the appointment is confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (
    queue.length ===
    0
  ) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-6 text-center">
          <ListOrdered className="mx-auto h-6 w-6 text-muted-foreground/50" />

          <p className="mt-2 text-xs text-muted-foreground">
            No current queue information is available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-2">
          {queue.map(
            (
              item,
              index
            ) => {
              const current =
                String(
                  item?.appointmentId
                ) ===
                  String(
                    appointmentId
                  ) ||
                String(
                  item?.appointment?.id
                ) ===
                  String(
                    appointmentId
                  );

              return (
                <div
                  key={
                    item?.queueId ||
                    item?.id ||
                    item?.appointmentId ||
                    index
                  }
                  className={[
                    'rounded-lg border p-3.5 transition-colors',
                    current
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-background',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-lg font-black',
                        current
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground',
                      ].join(' ')}
                    >
                      {
                        item?.queueNumber ||
                          index +
                            1
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {current && (
                          <Badge className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase">
                            Current Appointment
                          </Badge>
                        )}

                        <span className="text-sm font-semibold text-foreground">
                          {item?.customer?.fullname ||
                            item?.appointment
                              ?.customer
                              ?.fullname ||
                            'Customer'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CarFront className="h-3 w-3" />

                          {item?.vehicle?.plateNumber ||
                            item?.appointment
                              ?.vehicle
                              ?.plateNumber ||
                            'N/A'}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />

                          {item?.appointmentTime ||
                            item?.appointment
                              ?.appointmentTime ||
                            '—'}
                        </span>
                      </div>

                      {item?.services?.length >
                        0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.services.map(
                            (
                              service: any,
                              serviceIndex: number
                            ) => (
                              <Badge
                                key={
                                  service?.id ||
                                  serviceIndex
                                }
                                variant="secondary"
                                className="rounded-full text-[9px]"
                              >
                                {service?.name ||
                                  service}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {current && (
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </CardContent>
    </Card>
  );
}