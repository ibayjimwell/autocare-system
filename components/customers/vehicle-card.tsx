'use client';

import React, { useState, useEffect } from 'react';

import { vehiclesApi } from '@/lib/customers/vehicles';

import {
  Car,
  AlertCircle,
} from 'lucide-react';

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
  customerId: string;
  className?: string;
}

export default function VehicleCard({
  vehicleId,
  customerId,
  className,
}: VehicleCardProps) {
  const [vehicle, setVehicle] =
    useState<VehicleData | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId || !customerId) {
      setIsLoading(false);
      return;
    }

    async function fetchVehicle() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await vehiclesApi.get(
          customerId,
          vehicleId
        );

        const data =
          response?.data ||
          response?.vehicle ||
          response;

        if (data && data.plateNumber) {
          setVehicle(data);
        } else {
          setError('Vehicle record not found.');
        }
      } catch (err) {
        setError(
          'Failed to fetch vehicle information.'
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVehicle();
  }, [vehicleId, customerId]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex w-full animate-pulse items-center gap-3 rounded-lg border border-border bg-card p-3',
          className
        )}
      >
        <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />

        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-36 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive',
          className
        )}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />

        <span>
          {error || 'Missing vehicle parameters.'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        `
        relative flex w-full items-center gap-3
        overflow-hidden rounded-lg border border-border
        bg-card p-3
        transition-colors hover:bg-muted/30
        `,
        className
      )}
    >
      <Car
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -bottom-5 -right-3 h-16 w-16
          select-none text-primary/5
        "
      />

      <div
        className="
          relative flex h-11 w-11 shrink-0
          flex-col items-center justify-center
          rounded-md border border-primary/10
          bg-primary/10 text-primary
        "
      >
        <Car className="h-4 w-4" />

        {vehicle.year && (
          <span className="mt-0.5 text-[9px] font-bold text-muted-foreground">
            {vehicle.year}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold uppercase tracking-wide text-foreground md:text-base">
          {vehicle.make}{' '}
          <span className="text-primary">
            {vehicle.model}
          </span>
        </h4>

        <div className="mt-1.5">
          <div className="inline-flex select-all items-center gap-1 rounded-sm border-2 border-border bg-background px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-foreground shadow-sm">
            <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
            {vehicle.plateNumber}
          </div>
        </div>
      </div>
    </div>
  );
}