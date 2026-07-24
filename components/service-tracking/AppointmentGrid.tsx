// components/service-tracking/AppointmentGrid.tsx
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
  Eye,
  Play,
  ArrowRight,
  Car,
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
            : `No ${activeFilter === 'CONFIRMED'
                ? "today's confirmed"
                : FILTER_OPTIONS.find((f) => f.value === activeFilter)?.label?.toLowerCase()
              } appointments.`
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {appointments.map((appt) => (
        <AppointmentCard
          key={appt.id}
          appointment={appt}
          className="h-full"
        >
          <div className="space-y-3">
            <CustomerCard customerId={appt.customerId} />
            <VehicleCard
              vehicleId={appt.vehicleId}
              customerId={appt.customerId}
            />
            {appt.services && appt.services.length > 0 ? (
              appt.services.map((service: any) => (
                <ServiceCard key={service.id} serviceId={service.id} />
              ))
            ) : (
              <div className="text-xs text-muted-foreground italic">
                No services selected.
              </div>
            )}
            <StaffCards appointmentId={appt.id} />
            <Button
              className={cn(
                'w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95',
                appt.status === 'CONFIRMED'
                  ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                  : 'bg-slate-900 hover:bg-black text-white'
              )}
              onClick={() => handleInspect(appt)}
            >
              {appt.status === 'CONFIRMED' ? (
                <>
                  <Eye className="w-4 h-4 mr-2" /> Start Inspection
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Continue Work
                </>
              )}
              <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
            </Button>
          </div>
        </AppointmentCard>
      ))}
    </div>
  );
}