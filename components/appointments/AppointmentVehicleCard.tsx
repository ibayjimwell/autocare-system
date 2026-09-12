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
  CarFront,
  Hash,
} from 'lucide-react';

export default function AppointmentVehicleCard({
  vehicle,
}: {
  vehicle: any;
}) {
  if (!vehicle) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            Vehicle information is unavailable.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CarFront className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold uppercase tracking-wide text-foreground">
                {
                  vehicle.make ||
                    'Vehicle'
                }{' '}
                <span className="text-primary">
                  {vehicle.model ||
                    ''}
                </span>
              </h4>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-sm border-2 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest"
                >
                  <Hash className="mr-1 h-3 w-3" />

                  {
                    vehicle.plateNumber ||
                      'N/A'
                  }
                </Badge>

                {vehicle.year && (
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[10px] font-semibold"
                  >
                    {
                      vehicle.year
                    }
                  </Badge>
                )}
              </div>

              {vehicle.id && (
                <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">
                  Vehicle ID: {
                    vehicle.id
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}