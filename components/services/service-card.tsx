'use client';

import React, { useState, useEffect } from 'react';
import { servicesApi } from '@/lib/services/services';
import { Clock, Wrench, ClipboardList, Gauge, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | number | null;
  estimatedDuration: number; // maps to duration_minutes
  durationMinutes?: number;   // fallback for api mutations
  active: boolean;
  type: 'PMS' | 'REPAIR' | 'CHECKUP' | string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCardProps {
  serviceId: string;
  className?: string;
}

// Visual layout configuration engine for shop service categorization
const SERVICE_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<any> }> = {
  PMS: { label: 'PMS', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: ClipboardList },
  REPAIR: { label: 'Repair', bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary-foreground', icon: Wrench },
  CHECKUP: { label: 'Checkup', bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: Gauge },
};

export default function ServiceCard({ serviceId, className }: ServiceCardProps) {
  const [service, setService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }

    async function fetchService() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await servicesApi.get(serviceId);
        const data = response?.data || response?.service || response;

        if (data && data.name) {
          setService(data);
        } else {
          setError('Service configuration not found.');
        }
      } catch (err) {
        setError('Failed to fetch service catalog item.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchService();
  }, [serviceId]);

  // Micro Horizontal Line Item Skeleton
  if (isLoading) {
    return (
      <div className={cn("w-full rounded-md border border-border bg-card/60 p-3 flex items-center justify-between gap-4 animate-pulse", className)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 bg-muted rounded-sm shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-3 w-1/4 bg-muted rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-muted rounded shrink-0" />
      </div>
    );
  }

  // Error Boundary Fallback State
  if (error || !service) {
    return (
      <div className={cn("w-full rounded-md border border-destructive/10 bg-destructive/5 p-3 flex items-center gap-2 text-destructive text-xs font-medium", className)}>
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error || "Missing service identification parameter."}</span>
      </div>
    );
  }

  // Determine configuration settings based on types
  const typeConfig = SERVICE_TYPE_CONFIG[service.type.toUpperCase()] || {
    label: service.type,
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: Wrench
  };
  const TypeIcon = typeConfig.icon;

  // Format Duration safely (e.g., convert 90 minutes into "1h 30m" layout metrics)
  const rawMinutes = service.estimatedDuration || service.durationMinutes || 0;
  const formattedDuration = rawMinutes >= 60 
    ? `${Math.floor(rawMinutes / 60)}h ${rawMinutes % 60 > 0 ? `${rawMinutes % 60}m` : ''}`
    : `${rawMinutes} mins`;

  // Safely parse out price representations
  const formattedPrice = service.basePrice 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(Number(service.basePrice))
    : 'Quote Req.';

  return (
    <div 
      className={cn(
        "group w-full rounded-md border border-border/80 bg-card p-3 transition-colors flex items-center justify-between gap-4 select-none",
        !service.active && "opacity-60 grayscale-[30%]",
        className
      )}
    >
      {/* Left Metadata Context Segment */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Dynamic Context Classification Icon Box */}
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10", typeConfig.bg, typeConfig.text)}>
          <TypeIcon className="h-4 w-4" />
        </div>

        {/* Content Labels */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.25 rounded-2xs border border-transparent", typeConfig.bg, typeConfig.text)}>
              {typeConfig.label}
            </span>
            
            {/* Active/Offered Status Ring Dot Indicator */}
            <span 
              className={cn(
                "h-1.5 w-1.5 rounded-full inline-block ring-2 ring-background", 
                service.active ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-muted-foreground/60"
              )}
              title={service.active ? "Offered / Active" : "Suspended / Inactive"}
            />
          </div>

          <h4 className="font-sans text-sm font-bold tracking-tight text-foreground truncate">
            {service.name}
          </h4>

          {/* Time metrics row data block */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3 text-secondary shrink-0" />
            <span>{formattedDuration}</span>
          </div>
        </div>
      </div>

      {/* Right Fiscal Value Segment */}
      <div className="text-right shrink-0 flex flex-col justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 block leading-none mb-0.5">
          Base Price
        </span>
        <span className="font-heading text-base font-bold tracking-tight text-foreground">
          {formattedPrice}
        </span>
      </div>
    </div>
  );
}