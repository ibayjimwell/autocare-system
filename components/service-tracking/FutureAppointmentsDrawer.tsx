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

import {
  Button,
} from '@/components/ui/button';

import AppointmentCard from '@/components/appointments/appointment-card';

import {
  Calendar,
  CalendarDays,
  ChevronRight,
  X,
} from 'lucide-react';

import {
  format,
  parseISO,
} from 'date-fns';

/* ================================================================
   PROPS
================================================================ */

interface FutureAppointmentsDrawerProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  appointments: any[];

  onInspect: (
    appt: any,
  ) => void;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function FutureAppointmentsDrawer({
  open,
  onOpenChange,
  appointments,
  onInspect,
}: FutureAppointmentsDrawerProps) {
  /* ==============================================================
     GROUP BY DATE
  ============================================================== */

  const grouped =
    appointments.reduce(
      (
        accumulator,
        appointment,
      ) => {
        const date =
          appointment.appointmentDate;

        if (
          !accumulator[date]
        ) {
          accumulator[date] =
            [];
        }

        accumulator[
          date
        ].push(
          appointment,
        );

        return accumulator;
      },
      {} as Record<
        string,
        any[]
      >,
    );

  /* ==============================================================
     SORT DATES
  ============================================================== */

  const sortedDates =
    Object.keys(
      grouped,
    ).sort();

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Drawer
      open={
        open
      }
      onOpenChange={
        onOpenChange
      }
    >
      <DrawerContent
        className="
          flex
          h-[94vh]
          flex-col
          overflow-hidden
          rounded-t-2xl
          border-border
          bg-background

          sm:h-[90vh]
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DrawerHeader
          className="
            shrink-0
            border-b
            border-border
            px-4
            py-4
            text-left

            sm:px-6
            sm:py-5
          "
        >
          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  bg-primary/10
                  text-primary
                "
              >
                <CalendarDays className="h-5 w-5" />
              </div>

              <div
                className="
                  min-w-0
                "
              >
                <DrawerTitle
                  className="
                    truncate
                    text-lg
                    font-semibold
                    tracking-tight

                    sm:text-xl
                  "
                >
                  Future Appointments
                </DrawerTitle>

                <DrawerDescription
                  className="
                    mt-1
                    max-w-2xl
                    text-xs
                    leading-5

                    sm:text-sm
                  "
                >
                  Confirmed appointments scheduled after today.
                  You can start an inspection early when a customer
                  arrives ahead of schedule.
                </DrawerDescription>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* ========================================================
            CONTENT
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain

            [-webkit-overflow-scrolling:touch]
          "
        >
          {/* ======================================================
              EMPTY
          ======================================================= */}

          {appointments.length ===
          0 ? (
            <div
              className="
                flex
                min-h-[400px]
                flex-col
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-card
                  text-muted-foreground
                  shadow-sm
                "
              >
                <Calendar className="h-6 w-6" />
              </div>

              <h3
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                No future appointments
              </h3>

              <p
                className="
                  mt-1
                  max-w-sm
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                There are no confirmed appointments scheduled
                after today.
              </p>
            </div>
          ) : (
            /* ====================================================
               DATE GROUPS
            ===================================================== */

            <div
              className="
                space-y-8
                p-4
                pb-6

                sm:p-6
              "
            >
              {sortedDates.map(
                (
                  date,
                ) => {
                  const dayAppointments =
                    grouped[
                      date
                    ];

                  const displayDate =
                    format(
                      parseISO(
                        date,
                      ),
                      'EEEE, MMMM d, yyyy',
                    );

                  return (
                    <section
                      key={
                        date
                      }
                      className="
                        space-y-4
                      "
                    >
                      {/* ==========================================
                          TOP DATE
                          
                          This date header is intentionally retained.
                      =========================================== */}

                      <div
                        className="
                          sticky
                          top-0
                          z-10
                          bg-background/90
                          py-2
                          backdrop-blur-xl
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-3
                          "
                        >
                          <div
                            className="
                              h-px
                              flex-1
                              bg-border
                            "
                          />

                          <div
                            className="
                              flex
                              shrink-0
                              items-center
                              gap-2
                              rounded-md
                              border
                              border-border
                              bg-card
                              px-3
                              py-1.5
                              shadow-sm
                            "
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />

                            <h3
                              className="
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wider
                                text-foreground
                              "
                            >
                              {
                                displayDate
                              }
                            </h3>

                            <span
                              className="
                                rounded
                                bg-muted
                                px-1.5
                                py-0.5
                                text-[10px]
                                font-semibold
                                text-muted-foreground
                              "
                            >
                              {
                                dayAppointments.length
                              }
                            </span>
                          </div>

                          <div
                            className="
                              h-px
                              flex-1
                              bg-border
                            "
                          />
                        </div>
                      </div>

                      {/* ==========================================
                          APPOINTMENT CARDS
                          
                          No duplicate CustomerCard,
                          VehicleCard, ServiceCard,
                          StaffCards or separate time block.
                          
                          AppointmentCard already provides the
                          appointment summary.
                      =========================================== */}

                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4

                          sm:grid-cols-2

                          lg:grid-cols-3

                          xl:grid-cols-4
                        "
                      >
                        {dayAppointments.map(
                          (
                            appointment,
                          ) => (
                            <AppointmentCard
                              key={
                                appointment.id
                              }
                              appointment={
                                appointment
                              }
                              className="
                                h-full
                                w-full
                                overflow-hidden
                                rounded-xl
                                border
                                border-border
                                bg-card
                                shadow-sm

                                hover:shadow-md
                              "
                            >
                              {/* =================================
                                  INSPECTION ACTION ONLY
                              ================================== */}

                              <div
                                className="
                                  flex
                                  flex-col
                                  gap-2
                                  rounded-lg
                                  border
                                  border-border
                                  bg-background/60
                                  p-3
                                "
                              >
                                <p
                                  className="
                                    text-[10px]
                                    font-medium
                                    uppercase
                                    tracking-wider
                                    text-muted-foreground
                                  "
                                >
                                  Future Appointment
                                </p>

                                <p
                                  className="
                                    text-xs
                                    leading-5
                                    text-muted-foreground
                                  "
                                >
                                  This appointment is scheduled for
                                  a future service date.
                                </p>

                                <Button
                                  type="button"
                                  onClick={() =>
                                    onInspect(
                                      appointment,
                                    )
                                  }
                                  className="
                                    h-11
                                    w-full
                                    justify-between
                                    rounded-md
                                    bg-primary
                                    px-4
                                    text-sm
                                    font-semibold
                                    text-primary-foreground
                                    hover:bg-primary/90

                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-ring
                                    focus-visible:ring-offset-2

                                    md:h-9
                                    md:text-xs
                                  "
                                >
                                  <span>
                                    Start Inspection
                                  </span>

                                  <ChevronRight className="h-4 w-4 opacity-75" />
                                </Button>
                              </div>
                            </AppointmentCard>
                          ),
                        )}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <DrawerFooter
          className="
            shrink-0
            border-t
            border-border
            bg-background/90
            p-4
            backdrop-blur-xl

            sm:p-5
          "
        >
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(
                false,
              )
            }
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