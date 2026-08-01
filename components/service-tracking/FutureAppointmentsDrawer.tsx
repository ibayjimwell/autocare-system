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
import { format, parseISO } from 'date-fns';

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
  // Group appointments by date (YYYY-MM-DD)
  const grouped = appointments.reduce((acc, appt) => {
    const date = appt.appointmentDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(appt);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort dates ascending
  const sortedDates = Object.keys(grouped).sort();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-xl font-black">
            <Calendar className="w-5 h-5 text-primary" />
            Future Confirmed Appointments
          </DrawerTitle>
          <DrawerDescription>
            These appointments are scheduled after today. You can still start inspection early if the customer arrives.
          </DrawerDescription>
        </DrawerHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No future confirmed appointments.
            </p>
          ) : (
            <div className="space-y-8 pb-4">
              {sortedDates.map((date) => {
                const dayAppts = grouped[date];
                const displayDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

                return (
                  <div key={date} className="space-y-4">
                    {/* Date header */}
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                        {displayDate}
                      </h3>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Appointment cards for this date – horizontal grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {dayAppts.map((appt) => (
                        <AppointmentCard
                          key={appt.id}
                          appointment={appt}
                          className="w-full h-full"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DrawerFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" /> Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}