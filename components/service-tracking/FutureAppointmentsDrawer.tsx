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

import {
  Calendar,
  CalendarDays,
  Car,
  ChevronRight,
  Clock3,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  format,
  parseISO,
} from 'date-fns';

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
  // -----------------------------------------------------------
  // Group appointments by date
  // -----------------------------------------------------------
  const grouped = appointments.reduce(
    (acc, appt) => {
      const date = appt.appointmentDate;

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(appt);

      return acc;
    },
    {} as Record<string, any[]>
  );

  // -----------------------------------------------------------
  // Sort dates ascending
  // -----------------------------------------------------------
  const sortedDates =
    Object.keys(grouped).sort();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        className="
          h-[94vh]
          rounded-t-2xl
          border-border
          bg-background
          sm:h-[90vh]
        "
      >
        {/* -------------------------------------------------------
         * HEADER
         * ----------------------------------------------------- */}
        <DrawerHeader className="shrink-0 border-b border-border px-4 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <DrawerTitle className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                  Future Appointments
                </DrawerTitle>

                <DrawerDescription className="mt-1 max-w-2xl text-xs leading-5 sm:text-sm">
                  Confirmed appointments scheduled after today.
                  You can start an inspection early when a customer
                  arrives ahead of schedule.
                </DrawerDescription>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* -------------------------------------------------------
         * CONTENT
         * ----------------------------------------------------- */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
                <Calendar className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-foreground">
                No future appointments
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                There are no confirmed appointments scheduled
                after today.
              </p>
            </div>
          ) : (
            <div className="space-y-8 p-4 pb-6 sm:p-6">
              {sortedDates.map((date) => {
                const dayAppts = grouped[date];

                const displayDate = format(
                  parseISO(date),
                  'EEEE, MMMM d, yyyy'
                );

                return (
                  <section
                    key={date}
                    className="space-y-4"
                  >
                    {/* -------------------------------------------------
                     * DATE HEADER
                     * ----------------------------------------------- */}
                    <div className="sticky top-0 z-10 bg-background/80 py-2 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />

                        <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 shadow-sm">
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />

                          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                            {displayDate}
                          </h3>

                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {dayAppts.length}
                          </span>
                        </div>

                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>

                    {/* -------------------------------------------------
                     * APPOINTMENTS
                     * ----------------------------------------------- */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {dayAppts.map(
                        (appt) => (
                          <AppointmentCard
                            key={appt.id}
                            appointment={appt}
                            className="
                              h-full
                              w-full
                              overflow-hidden
                              rounded-xl
                              border
                              border-border
                              bg-card
                              shadow-sm
                            "
                          >
                            <div className="flex h-full flex-col">
                              {/* Header */}
                              <div className="border-b border-border p-4">
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

                                  <span className="shrink-0 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    Confirmed
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 space-y-3 p-4">
                                {/* Time */}
                                {appt.appointmentTime && (
                                  <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                                    <div className="min-w-0">
                                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Scheduled time
                                      </p>

                                      <p className="text-xs font-semibold text-foreground">
                                        {appt.appointmentTime}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <CustomerCard
                                  customerId={
                                    appt.customerId
                                  }
                                />

                                <VehicleCard
                                  vehicleId={
                                    appt.vehicleId
                                  }
                                  customerId={
                                    appt.customerId
                                  }
                                />

                                {appt.services &&
                                appt.services.length >
                                  0 ? (
                                  <div className="space-y-2">
                                    {appt.services.map(
                                      (service: any) => (
                                        <ServiceCard
                                          key={
                                            service.id
                                          }
                                          serviceId={
                                            service.id
                                          }
                                        />
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">
                                      No services selected.
                                    </p>
                                  </div>
                                )}

                                <StaffCards
                                  appointmentId={
                                    appt.id
                                  }
                                />
                              </div>

                              {/* Action */}
                              <div className="border-t border-border p-4">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    onInspect(appt)
                                  }
                                  className={cn(
                                    'h-11 w-full justify-between rounded-md px-4 md:h-9',
                                    'bg-primary text-primary-foreground hover:bg-primary/90',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                                  )}
                                >
                                  <span className="text-xs font-semibold">
                                    Start Inspection
                                  </span>

                                  <ChevronRight className="h-4 w-4 opacity-75" />
                                </Button>
                              </div>
                            </div>
                          </AppointmentCard>
                        )
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------
         * FOOTER
         * ----------------------------------------------------- */}
        <DrawerFooter className="shrink-0 border-t border-border bg-background/80 p-4 backdrop-blur-xl sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="
              h-11
              w-full
              rounded-md
              sm:w-auto
              sm:self-end
              md:h-9
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}