'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';
import EmptyState from '@/components/shared/empty-state';

import {
  ArrowRight,
  Car,
  Eye,
  Play,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { FILTER_OPTIONS } from '@/app-utils/service-tracking/constants';

interface AppointmentGridProps {
  appointments: any[];
  search: string;
  activeFilter: string;
  handleInspect: (appt: any) => void;
}

export default function AppointmentGrid({
  appointments,
  search,
  activeFilter,
  handleInspect,
}: AppointmentGridProps) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No active jobs"
        description={
          search.trim()
            ? 'No appointments match your search criteria.'
            : `No ${
                activeFilter === 'CONFIRMED'
                  ? "today's confirmed"
                  : FILTER_OPTIONS.find(
                      (f) => f.value === activeFilter
                    )?.label?.toLowerCase()
              } appointments.`
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {appointments.map((appt) => {
        const confirmed = appt.status === 'CONFIRMED';

        return (
          <AppointmentCard
            key={appt.id}
            appointment={appt}
            className={cn(
              'h-full overflow-hidden rounded-xl',
              'border border-border bg-card shadow-sm',
              'transition-shadow duration-200 hover:shadow-md'
            )}
          >
            <div className="flex h-full flex-col">
              {/* Card identity */}
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {appt.customer?.fullname ||
                        appt.customerName ||
                        'Customer'}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {appt.vehicle?.plateNumber ||
                          appt.vehiclePlate ||
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                      confirmed
                        ? 'border-primary/20 bg-primary/5 text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {confirmed ? 'Ready' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-3 p-4">
                <CustomerCard customerId={appt.customerId} />

                <VehicleCard
                  vehicleId={appt.vehicleId}
                  customerId={appt.customerId}
                />

                {appt.services && appt.services.length > 0 ? (
                  <div className="space-y-2">
                    {appt.services.map((service: any) => (
                      <ServiceCard
                        key={service.id}
                        serviceId={service.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      No services selected.
                    </p>
                  </div>
                )}

                <StaffCards appointmentId={appt.id} />
              </div>

              {/* Primary operation */}
              <div className="border-t border-border p-4">
                <Button
                  type="button"
                  onClick={() => handleInspect(appt)}
                  className={cn(
                    'h-11 w-full justify-between rounded-md px-4 md:h-9',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    confirmed
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  )}
                >
                  <span className="flex items-center">
                    {confirmed ? (
                      <Eye className="mr-2 h-4 w-4" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}

                    <span className="text-xs font-semibold">
                      {confirmed
                        ? 'Start Inspection'
                        : 'Continue Work'}
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 opacity-70" />
                </Button>
              </div>
            </div>
          </AppointmentCard>
        );
      })}
    </div>
  );
}