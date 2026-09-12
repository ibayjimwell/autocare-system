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
  CalendarDays,
  Clock3,
  FileText,
  Hash,
} from 'lucide-react';

function formatDate(
  value: any
) {
  if (!value) {
    return 'Not specified';
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

  return date.toLocaleDateString(
    'en-PH',
    {
      weekday:
        'long',
      year:
        'numeric',
      month:
        'long',
      day:
        'numeric',
    }
  );
}

function formatTime(
  value: any
) {
  if (!value) {
    return 'Not specified';
  }

  const [
    hourString,
    minuteString,
  ] = String(
    value
  )
    .slice(
      0,
      5
    )
    .split(':');

  const hour =
    Number(hourString);

  const minute =
    Number(
      minuteString
    );

  if (
    Number.isNaN(
      hour
    ) ||
    Number.isNaN(
      minute
    )
  ) {
    return String(
      value
    );
  }

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(
    2,
    '0'
  )} ${suffix}`;
}

function formatDateTime(
  value: any
) {
  if (!value) {
    return 'Not available';
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

export default function AppointmentInfoCard({
  appointment,
}: {
  appointment: any;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />

              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Tracking Number
              </span>
            </div>

            <p className="break-all font-mono text-sm font-bold text-foreground">
              #
              {appointment?.trackingNumber ||
                'N/A'}
            </p>
          </div>

          <div className="bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />

              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Booked Date
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground">
              {formatDate(
                appointment?.appointmentDate
              )}
            </p>
          </div>

          <div className="bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />

              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Booked Time
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground">
              {formatTime(
                appointment?.appointmentTime
              )}
            </p>
          </div>

          <div className="bg-card p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </div>

            <Badge className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
              {String(
                appointment?.status ||
                  'PENDING'
              ).replace(
                /_/g,
                ' '
              )}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Appointment ID
            </p>

            <p className="break-all font-mono text-xs text-foreground">
              {appointment?.id ||
                'N/A'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Customer ID
            </p>

            <p className="break-all font-mono text-xs text-foreground">
              {appointment?.customerId ||
                'N/A'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vehicle ID
            </p>

            <p className="break-all font-mono text-xs text-foreground">
              {appointment?.vehicleId ||
                'N/A'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Appointment Created
            </p>

            <p className="text-xs text-foreground">
              {formatDateTime(
                appointment?.createdAt
              )}
            </p>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Last Updated
            </p>

            <p className="text-xs text-foreground">
              {formatDateTime(
                appointment?.updatedAt
              )}
            </p>
          </div>

          {appointment?.notes && (
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-2.5">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Appointment Notes
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground">
                      {
                        appointment.notes
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}