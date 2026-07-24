// components/service-tracking/FutureAppointmentsDrawer.tsx
'use client';

import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';
import { Calendar, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FutureAppointmentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: any[];
  onInspect: (appt: any) => void;
}

export default function FutureAppointmentsDrawer({
  open,
  onOpenChange,
  appointments,
  onInspect,
}: FutureAppointmentsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-xl font-black">
            <Calendar className="w-5 h-5 text-primary" />
            Future Confirmed Appointments
          </DrawerTitle>
          <DrawerDescription>
            These appointments are scheduled after today. You can still start inspection early if the customer arrives.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 p-4">
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No future confirmed appointments.
            </p>
          ) : (
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
                      className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      onClick={() => onInspect(appt)}
                    >
                      Start Inspection
                    </Button>
                  </div>
                </AppointmentCard>
              ))}
            </div>
          )}
        </ScrollArea>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" /> Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}