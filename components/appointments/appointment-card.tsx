'use client';

import React, { useState, useEffect } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';
import StatusBadge from '../shared/status-badge';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusAccentBar from './status-accent-bar';

interface AppointmentData {
  id: string;
  customerId: string;
  vehicleId: string;
  services: string[] | null;
  trackingNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentCardProps {
  appointmentId: string;
  children?: React.ReactNode;
  className?: string;
}

export default function AppointmentCard({ appointmentId, children, className }: AppointmentCardProps) {
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    async function fetchAppointment() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await appointmentsApi.get(appointmentId);
        const data = response?.data || response?.appointment || response;

        if (data && (data.trackingNumber || data.id)) {
          setAppointment(data);
        } else {
          setError('No appointment record found.');
        }
      } catch (err) {
        setError('Failed to fetch appointment info.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppointment();
  }, [appointmentId]);

  // Compact Skeleton Loader
  if (isLoading) {
    return (
      <div className={cn("w-full max-w-md rounded-lg border border-border bg-card p-4 animate-pulse shadow-xs", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-28 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
        <div className="flex gap-4 mb-1">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Safe Fallback / Error Boundaries
  if (error || !appointment) {
    return (
      <div className={cn("w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-2 text-destructive", className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium tracking-wide">{error || "Missing appointment ID reference."}</span>
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
      {/* Decorative horizontal top accent bar*/}
      <StatusAccentBar status={appointment.status} />
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between gap-4 mb-2.5">
        {/* Top Left: Tracking Number using Oswald typeface */}
        <span className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
          #{appointment.trackingNumber}
        </span>
        
        {/* Top Right: Native Status Badge */}
        <StatusBadge status={appointment.status} className="shrink-0 scale-95 origin-right" />
      </div>

      {/* Date and Time Layout Grid Row */}
      <div className="flex flex-row items-center gap-x-4 text-xs font-medium text-muted-foreground border-b border-border/40 pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>
            {appointment.appointmentDate 
              ? new Date(appointment.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-secondary" />
          <span>{appointment.appointmentTime ? appointment.appointmentTime.slice(0, 5) : 'N/A'}</span>
        </div>
      </div>

      {/* Extensible Component Content Insertion Point */}
      {children && (
        <div className="flex flex-col gap-2 mt-2">
          {children}
        </div>
      )}
    </div>
  );
}