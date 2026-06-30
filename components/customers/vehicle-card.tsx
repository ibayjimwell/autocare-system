'use client';

import React, { useState, useEffect } from 'react';
import { vehiclesApi } from '@/lib/customers/vehicles';
import { Car, Hash, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleData {
  id: string;
  customerId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleCardProps {
  vehicleId: string;
  customerId: string; // Required by your api.get(customerId, vehicleId) signature
  className?: string;
}

export default function VehicleCard({ vehicleId, customerId, className }: VehicleCardProps) {
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId || !customerId) {
      setIsLoading(false);
      return;
    }

    async function fetchVehicle() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await vehiclesApi.get(customerId, vehicleId);
        // Handle unwrapped or wrapped data layers safely
        const data = response?.data || response?.vehicle || response;

        if (data && data.plateNumber) {
          setVehicle(data);
        } else {
          setError('Vehicle record not found.');
        }
      } catch (err) {
        setError('Failed to fetch vehicle information.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVehicle();
  }, [vehicleId, customerId]);

  // Micro Horizontal Skeleton Loader
  if (isLoading) {
    return (
      <div className={cn("w-full rounded-md border border-border bg-card/50 p-3 flex items-center gap-3 animate-pulse", className)}>
        <div className="h-10 w-10 bg-muted rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-3 w-36 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error Fallback State
  if (error || !vehicle) {
    return (
      <div className={cn("w-full rounded-md border border-destructive/10 bg-destructive/5 p-3 flex items-center gap-2 text-destructive text-xs", className)}>
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error || "Missing vehicle parameters."}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border/70 bg-muted/30 p-3 transition-all hover:bg-muted/50 flex items-center gap-3.5",
        className
      )}
    >
      {/* Decorative Automotive Background Watermark */}
      <Car className="absolute -right-3 -bottom-5 h-16 w-16 text-primary/20 pointer-events-none select-none" />

      {/* Left Icon Panel: Mechanical Garage Aesthetic Badge */}
      <div className="relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-heading font-semibold text-sm tracking-wider">
        <Car className="h-4 w-4" />
        {vehicle.year && (
          <span className="text-[9px] font-sans font-bold tracking-tight text-muted-foreground mt-0.5">
            {vehicle.year}
          </span>
        )}
      </div>

      {/* Center Metadata Identity Block */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Car Identity Headline */}
        <h4 className="font-heading text-base font-bold tracking-wide text-foreground uppercase truncate leading-none">
          {vehicle.make} <span className="text-primary">{vehicle.model}</span>
        </h4>
        
        {/* Row Element: Micro Digital License Plate Graphic Component */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-card border-2 border-secondary/40 text-foreground font-heading font-bold text-xs tracking-widest shadow-xs select-all uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 block shrink-0" />
            {vehicle.plateNumber}
          </div>
        </div>
      </div>
      
    </div>
  );
}