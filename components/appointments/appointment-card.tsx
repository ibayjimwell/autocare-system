import React from 'react';
import StatusBadge from '@/components/shared/status-badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
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
  if (!appointment) {
    return (
      <div className={cn("flex w-full items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-destructive", className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">Invalid appointment data.</span>
      </div>
    );
  }

  const hasPendingReschedule = pendingRescheduleCount > 0;
  const isReschedulable = canReschedule(appointment.status);

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md",
        className
      )}
    >
      <StatusAccentBar status={appointment.status} />

      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-heading text-base font-bold uppercase tracking-wide text-foreground">
          #{appointment.trackingNumber}
        </span>
        <StatusBadge status={appointment.status} className="shrink-0 origin-right scale-95" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 pb-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
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
          <Clock className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {appointment.appointmentTime ? appointment.appointmentTime.slice(0, 5) : 'N/A'}
          </span>
        </div>
      </div>

      {children && <div className="flex flex-col gap-2">{children}</div>}

      {/* ✅ Pending Reschedule Indicator with Pulse */}
      {isReschedulable && onReschedule && (
        <Button
          size="sm"
          variant="outline"
          className="relative mt-3 h-9 rounded-md px-3 text-xs font-medium"
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
  );
}