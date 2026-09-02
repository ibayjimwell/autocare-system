'use client';

import React from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import StatusBadge from '@/components/shared/status-badge';

import {
  CalendarDays,
  Car,
  ChevronRight,
  Clock,
  FileText,
  User,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const TRACKING_STATUSES = [
  'PENDING',
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_INSPECTION: 'Inspection',
  WAITING_FOR_APPROVAL: 'Approval',
  IN_PROGRESS: 'Repairing',
  COMPLETED: 'Done',
};

export default function ServiceTrackingCard({
  appointment,
  onClick,
}) {
  const statusIdx = TRACKING_STATUSES.indexOf(
    appointment.status
  );

  const currentStatus =
    appointment.status || 'PENDING';

  const safeStatusIndex =
    statusIdx >= 0 ? statusIdx : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-xl',
        'border border-border bg-card shadow-sm',
        'transition-all duration-200',
        'hover:border-primary/30 hover:shadow-md',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
      )}
    >
      {/* ---------------------------------------------------------
       * HEADER
       * ------------------------------------------------------- */}
      <CardHeader className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold text-foreground">
              {appointment.customerName ||
                'Customer'}
            </CardTitle>

            <div className="mt-1 flex items-center gap-2">
              <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <p className="truncate font-mono text-xs text-muted-foreground">
                {appointment.vehiclePlate || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadge
              status={currentStatus}
              className="text-[10px] font-semibold uppercase tracking-wide"
            />

            <ChevronRight
              className={cn(
                'h-4 w-4 text-muted-foreground',
                'transition-transform duration-200',
                'group-hover:translate-x-0.5 group-hover:text-primary'
              )}
            />
          </div>
        </div>
      </CardHeader>

      {/* ---------------------------------------------------------
       * INFORMATION
       * ------------------------------------------------------- */}
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-2">
          {appointment.serviceName && (
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Service
                </p>

                <p className="truncate text-xs font-medium text-foreground">
                  {appointment.serviceName}
                </p>
              </div>
            </div>
          )}

          {appointment.staffName && (
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Staff
                </p>

                <p className="truncate text-xs font-medium text-foreground">
                  {appointment.staffName}
                </p>
              </div>
            </div>
          )}

          {appointment.appointmentTime && (
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Appointment
                </p>

                <p className="truncate text-xs font-medium text-foreground">
                  {appointment.appointmentDate || '—'}
                  {' · '}
                  {appointment.appointmentTime}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------
         * STATUS PROGRESS
         * ------------------------------------------------------- */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center">
            {TRACKING_STATUSES.map(
              (status, index) => {
                const completed =
                  safeStatusIndex > index;
                const current =
                  safeStatusIndex === index;

                return (
                  <React.Fragment key={status}>
                    <div className="flex shrink-0 flex-col items-center">
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full border transition-colors',
                          completed || current
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background',
                          current &&
                            'ring-4 ring-primary/10'
                        )}
                      />
                    </div>

                    {index <
                      TRACKING_STATUSES.length -
                        1 && (
                      <div
                        className={cn(
                          'mx-1 h-px flex-1',
                          safeStatusIndex >
                            index
                            ? 'bg-primary'
                            : 'bg-border'
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              }
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium text-muted-foreground">
              Step {safeStatusIndex + 1} of{' '}
              {TRACKING_STATUSES.length}
            </p>

            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-primary">
              {STATUS_LABELS[currentStatus] ||
                currentStatus.replace(
                  /_/g,
                  ' '
                )}
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------
         * NOTES
         * ------------------------------------------------------- */}
        {appointment.notes && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-3">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------
         * OPEN INDICATOR
         * ------------------------------------------------------- */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            View service details
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}