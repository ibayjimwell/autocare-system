'use client';

import React, { useState } from 'react';

import StatusBadge from '@/components/shared/status-badge';

import {
  Calendar,
  Clock,
  AlertCircle,
  ChevronDown,
  User,
  Car,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import StatusAccentBar from './status-accent-bar';

import {
  canReschedule,
} from '@/app-utils/appointments/helpers';

import { Button } from '@/components/ui/button';

interface AppointmentData {
  id: string;
  customerId: string;
  vehicleId: string;
  services: any[] | null;
  trackingNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    fullname: string;
  };
  vehicle?: {
    plateNumber: string;
    model: string;
  };
}

interface AppointmentCardProps {
  appointment: AppointmentData;
  children?: React.ReactNode;
  className?: string;
  pendingRescheduleCount?: number;
  onReschedule?: (
    appointment: AppointmentData,
  ) => void;
}

export default function AppointmentCard({
  appointment,
  children,
  className,
  pendingRescheduleCount = 0,
  onReschedule,
}: AppointmentCardProps) {
  const [expanded, setExpanded] =
    useState(false);

  if (!appointment) {
    return (
      <div
        className={cn(
          `
            flex w-full items-center gap-2
            rounded-lg border border-destructive/25
            bg-destructive/10 p-3
            text-destructive md:p-4
          `,
          className,
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0" />

        <span className="text-xs font-medium">
          Invalid appointment data.
        </span>
      </div>
    );
  }

  const hasPendingReschedule =
    pendingRescheduleCount > 0;

  const isReschedulable =
    canReschedule(appointment.status);

  const hasDetails =
    !!children ||
    (isReschedulable && !!onReschedule);

  return (
    <div
      className={cn(
        `
          group relative w-full overflow-hidden
          rounded-lg border border-border
          bg-card text-card-foreground
          shadow-sm transition-shadow
          hover:shadow-md
        `,
        className,
      )}
    >
      <StatusAccentBar
        status={appointment.status}
      />

      <div className="p-3 md:p-3.5">
        {/* Summary row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="
                  truncate text-sm font-bold
                  uppercase tracking-wide text-foreground
                "
              >
                #{appointment.trackingNumber}
              </span>

              {hasPendingReschedule && (
                <span
                  className="relative flex h-2 w-2 shrink-0"
                  aria-label="Pending reschedule request"
                >
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-destructive/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {appointment.customer?.fullname && (
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
                  <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {appointment.customer.fullname}
                  </span>
                </span>
              )}

              {appointment.vehicle
                ?.plateNumber && (
                <span
                  className="
                    flex shrink-0 items-center gap-1
                    text-[10px] font-semibold
                    uppercase tracking-wide text-muted-foreground
                  "
                >
                  <Car className="h-3 w-3" />
                  {appointment.vehicle.plateNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge
              status={appointment.status}
              className="shrink-0 scale-90"
            />

            {hasDetails && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => !prev)
                }
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? 'Collapse appointment details'
                    : 'Expand appointment details'
                }
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-md text-muted-foreground
                  transition-colors hover:bg-accent
                  hover:text-foreground
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-8 md:w-8
                "
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
            )}
          </div>
        </div>

        {/* Appointment timing */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {appointment.appointmentDate
              ? new Date(
                  appointment.appointmentDate,
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A'}
          </span>

          <span className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {appointment.appointmentTime
              ? appointment.appointmentTime.slice(0, 5)
              : 'N/A'}
          </span>
        </div>

        {/* Details */}
        {hasDetails && (
          <div
            className={cn(
              'flex-col gap-1.5',
              expanded
                ? 'mt-3 flex border-t border-border pt-3'
                : 'hidden',
            )}
          >
            {children}

            {isReschedulable &&
              onReschedule && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onReschedule(appointment)
                  }
                  className="
                    relative mt-1 h-10 w-full
                    rounded-md px-3 text-xs font-medium
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    sm:w-auto md:h-9
                  "
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Reschedule

                  {hasPendingReschedule && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute h-3 w-3 animate-ping rounded-full bg-destructive/60" />
                      <span className="relative h-3 w-3 rounded-full bg-destructive" />
                    </span>
                  )}
                </Button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}