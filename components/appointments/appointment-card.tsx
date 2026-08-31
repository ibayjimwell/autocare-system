// components/appointments/appointment-card.tsx
import React, { useState } from 'react';
import StatusBadge from '@/components/shared/status-badge';
import { Calendar, Clock, AlertCircle, ChevronDown, User, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusAccentBar from './status-accent-bar';
import { canReschedule } from '@/app-utils/appointments/helpers';
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
  customer?: { fullname: string };
  vehicle?: { plateNumber: string; model: string };
}

interface AppointmentCardProps {
  appointment: AppointmentData;
  children?: React.ReactNode;
  className?: string;
  pendingRescheduleCount?: number;
  onReschedule?: (appointment: AppointmentData) => void;
}

export default function AppointmentCard({
  appointment,
  children,
  className,
  pendingRescheduleCount = 0,
  onReschedule,
}: AppointmentCardProps) {
  // Presentation-only disclosure state (no business logic): on small screens
  // the heavy detail block (customer/vehicle/service/staff cards + actions)
  // collapses behind the chevron so each agenda row stays a compact summary.
  // md+ always renders fully expanded.
  const [expanded, setExpanded] = useState(false);

  if (!appointment) {
    return (
      <div className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-destructive md:p-4",
        className
      )}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">Invalid appointment data.</span>
      </div>
    );
  }

  const hasPendingReschedule = pendingRescheduleCount > 0;
  const isReschedulable = canReschedule(appointment.status);
  // Only offer the disclosure when there is something to expand.
  const hasDetails = !!children || (isReschedulable && !!onReschedule);

  return (
    <div
      className={cn(
        // Compact card surface: tighter padding on touch, relaxed on pointer.
        "group relative w-full overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow duration-200 hover:shadow-md md:p-4",
        className
      )}
    >
      <StatusAccentBar status={appointment.status} />

      {/* ---- Summary header (always visible) ---- */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground md:text-base">
            #{appointment.trackingNumber}
          </span>
          {/* Pending-reschedule alert — surfaced here so it stays visible
              even while the detail block is collapsed on mobile. */}
          {hasPendingReschedule && (
            <span className="relative flex h-2 w-2 shrink-0" aria-label="Pending reschedule request">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={appointment.status} className="shrink-0 origin-right scale-95" />
          {/* Disclosure toggle — mobile only (md+ shows everything) */}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse appointment details" : "Expand appointment details"}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* ---- Meta: date · time (compact single line) ---- */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-muted-foreground md:text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-primary md:h-3.5 md:w-3.5" />
          <span>
            {appointment.appointmentDate
              ? new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span className="tabular-nums">
            {appointment.appointmentTime ? appointment.appointmentTime.slice(0, 5) : 'N/A'}
          </span>
        </div>
      </div>

      {/* ---- Mobile summary line: customer · plate (fields already on the
            appointment object — display-only, no new data plumbing) ---- */}
      {(appointment.customer?.fullname || appointment.vehicle?.plateNumber) && (
        <div className="mt-1.5 flex items-center gap-2 overflow-hidden text-xs text-muted-foreground md:hidden">
          {appointment.customer?.fullname && (
            <span className="flex min-w-0 items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.customer.fullname}</span>
            </span>
          )}
          {appointment.vehicle?.plateNumber && (
            <span className="flex shrink-0 items-center gap-1 font-semibold uppercase tracking-wide text-foreground/70">
              <Car className="h-3 w-3 shrink-0" />
              {appointment.vehicle.plateNumber}
            </span>
          )}
        </div>
      )}

      {/* ---- Detail block: children + reschedule action ----
           Collapsed below md (tap the chevron to expand); always open on md+.
           The exact same children nodes, handlers, and conditional logic —
           only the container is responsive. */}
      {hasDetails && (
        <div className={cn("flex-col gap-1.5 md:mt-3 md:gap-2", expanded ? "mt-2 flex" : "hidden md:flex")}>
          {children}

          {/* ✅ Pending Reschedule Indicator with Pulse */}
          {isReschedulable && onReschedule && (
            <Button
              size="sm"
              variant="outline"
              className="relative mt-1 h-9 w-full rounded-md px-3 text-xs font-medium sm:w-auto"
              onClick={() => onReschedule(appointment)}
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
  );
}