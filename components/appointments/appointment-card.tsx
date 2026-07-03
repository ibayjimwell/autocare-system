// components/appointments/appointment-card.tsx
import React from 'react';
import StatusBadge from '@/components/shared/status-badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusAccentBar from './status-accent-bar';

interface AppointmentData {
  id: string;
  customerId: string;
  vehicleId: string;
  services: any[] | null;      // service objects or IDs
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
  appointment: AppointmentData;     // full data from the list
  children?: React.ReactNode;
  className?: string;
}

export default function AppointmentCard({ appointment, children, className }: AppointmentCardProps) {
  if (!appointment) {
    return (
      <div className={cn("w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-2 text-destructive", className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">Invalid appointment data.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-card p-4 pt-5 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm",
        className
      )}
    >
      <StatusAccentBar status={appointment.status} />

      <div className="flex items-center justify-between gap-4 mb-2.5">
        <span className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
          #{appointment.trackingNumber}
        </span>
        <StatusBadge status={appointment.status} className="shrink-0 scale-95 origin-right" />
      </div>

      <div className="flex flex-row items-center gap-x-4 text-xs font-medium text-muted-foreground border-b border-border/40 pb-3 mb-3">
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
          <Clock className="h-3.5 w-3.5 text-secondary" />
          <span>{appointment.appointmentTime ? appointment.appointmentTime.slice(0, 5) : 'N/A'}</span>
        </div>
      </div>

      {children && <div className="flex flex-col gap-2 mt-2">{children}</div>}
    </div>
  );
}