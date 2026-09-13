'use client';

import React, {
  useState,
  useMemo,
} from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Input,
} from '@/components/ui/input';

import {
  Button,
} from '@/components/ui/button';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Clock,
  Search,
  CalendarDays,
  CheckCircle,
  XCircle,
  RefreshCw,
  CalendarClock,
} from 'lucide-react';

import AppointmentCard from '@/components/appointments/appointment-card';

import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';

import {
  useServiceQueue,
} from '@/hooks/queue/useServiceQueue';

import {
  format,
} from 'date-fns';

import {
  formatTime12h,
} from '@/app-utils/appointments/helpers';

import {
  cn,
} from '@/lib/utils';

import RescheduleRequestModal from './RescheduleRequestModal';

interface DailyAgendaProps {
  appointments: any[];

  selectedDate: Date;

  onConfirm: (
    appt: any,
  ) => void;

  onDecline: (
    appt: any,
    reason: string,
  ) => void;

  onRefresh?: () => void;
  pendingRescheduleMap?: Record<string, number>;
}

const STATUS_TABS = [
  {
    value: 'ALL',
    label: 'All',
  },
  {
    value: 'PENDING',
    label: 'Pending',
  },
  {
    value: 'CONFIRMED',
    label: 'Confirmed',
  },
  {
    value: 'UNDER_INSPECTION',
    label: 'Under Inspection',
  },
  {
    value: 'WAITING_FOR_APPROVAL',
    label: 'Waiting Approval',
  },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
  },
];

export default function DailyAgenda({
  appointments,
  selectedDate,
  onConfirm,
  onDecline,
  onRefresh,
  pendingRescheduleMap = {},
}: DailyAgendaProps) {
  const [
    sidebarFilter,
    setSidebarFilter,
  ] =
    useState('');

  const [
    activeStatus,
    setActiveStatus,
  ] =
    useState('ALL');

  const [
    declineModal,
    setDeclineModal,
  ] =
    useState<{
      open: boolean;
      appointment: any | null;
      reason: string;
    }>({
      open:
        false,

      appointment:
        null,

      reason:
        '',
    });

  const [
    rescheduleModal,
    setRescheduleModal,
  ] =
    useState<{
      open: boolean;
      appointment: any | null;
    }>({
      open:
        false,

      appointment:
        null,
    });

  const dateStr =
    format(
      selectedDate,
      'yyyy-MM-dd',
    );

  const isToday =
    dateStr ===
    format(
      new Date(),
      'yyyy-MM-dd',
    );

  const {
    queue,
    loading:
      queueLoading,
  } =
    useServiceQueue(
      dateStr,
      activeStatus ===
        'CONFIRMED',
    );

  const filteredAppointments =
    useMemo(
      () => {
        let data =
          appointments.filter(
            (
              appointment,
            ) => {
              const matchesDate =
                appointment.appointmentDate &&
                new Date(
                  `${appointment.appointmentDate}T00:00:00`,
                ).toDateString() ===
                  selectedDate.toDateString();

              const searchStr =
                `${appointment.customer?.fullname || ''} ${
                  appointment.vehicle?.plateNumber ||
                  ''
                } ${
                  appointment.vehicle?.model ||
                  ''
                }`.toLowerCase();

              const matchesSearch =
                searchStr.includes(
                  sidebarFilter.toLowerCase(),
                );

              return (
                matchesDate &&
                matchesSearch
              );
            },
          );

        if (
          activeStatus !==
          'ALL'
        ) {
          data =
            data.filter(
              (
                appointment,
              ) =>
                appointment.status ===
                activeStatus,
            );
        }

        return data.sort(
          (
            left,
            right,
          ) =>
            (
              left.appointmentTime ||
              ''
            ).localeCompare(
              right.appointmentTime ||
                '',
            ),
        );
      },
      [
        appointments,
        selectedDate,
        sidebarFilter,
        activeStatus,
      ],
    );

  /* ================================================================
     DECLINE
  ================================================================= */

  const handleDeclineOpen =
    (
      appointment: any,
    ) => {
      setDeclineModal({
        open:
          true,

        appointment,

        reason:
          '',
      });
    };

  const handleDeclineConfirm =
    () => {
      if (
        declineModal.appointment
      ) {
        onDecline(
          declineModal.appointment,
          declineModal.reason,
        );

        setDeclineModal({
          open:
            false,

          appointment:
            null,

          reason:
            '',
        });
      }
    };

  /* ================================================================
     RESCHEDULE
  ================================================================= */

  const handleRescheduleOpen =
    (
      appointment: any,
    ) => {
      setRescheduleModal({
        open:
          true,

        appointment,
      });
    };

  const handleRescheduleSuccess =
    () => {
      onRefresh?.();
    };

  /* ================================================================
     QUEUE
  ================================================================= */

  const renderQueue =
    () => {
      if (
        queueLoading
      ) {
        return (
          <div className="flex min-h-40 items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />

              <p className="text-sm text-muted-foreground">
                Loading queue...
              </p>
            </div>
          </div>
        );
      }

      if (
        queue.length ===
        0
      ) {
        return (
          <div className="flex min-h-40 items-center justify-center text-center">
            <div>
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />

              <p className="text-sm font-medium text-muted-foreground">
                No confirmed appointments
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                There is no service queue for this date.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {queue.map(
            (
              item,
            ) => (
              <Card
                key={
                  item.queueId
                }
                className="
                  rounded-lg
                  border-border
                  bg-card
                  p-3
                  shadow-sm
                  transition-shadow
                  hover:shadow-md
                  md:p-4
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex h-11 w-11 shrink-0 items-center
                      justify-center rounded-lg bg-primary/10
                      text-xl font-bold tabular-nums text-primary
                      md:h-12 md:w-12
                    "
                  >
                    {
                      item.queueNumber
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        {
                          item
                            .customer
                            ?.fullname ||
                          'Customer'
                        }
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {item.vehicle
                          ?.plateNumber
                          ? `Plate: ${item.vehicle.plateNumber}`
                          : 'Plate: N/A'}
                      </span>

                      <span className="text-xs tabular-nums text-muted-foreground">
                        {
                          item.appointmentTime
                        }
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.services?.map(
                        (
                          serviceId: string,
                        ) => (
                          <ServiceCard
                            key={
                              serviceId
                            }
                            serviceId={
                              serviceId
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      );
    };

  /* ================================================================
     APPOINTMENTS
  ================================================================= */

  const renderAppointments =
    () => {
      if (
        filteredAppointments.length ===
        0
      ) {
        return (
          <div className="flex min-h-72 items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
              </div>

              <p className="text-sm font-semibold text-muted-foreground">
                No appointments for this status
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Try a different status or search term.
              </p>
            </div>
          </div>
        );
      }

      const slots: {
        time: string;
        items: any[];
      }[] =
        [];

      filteredAppointments.forEach(
        (
          appointment,
        ) => {
          const slotTime =
            appointment.appointmentTime ||
            '—';

          const existing =
            slots.find(
              (
                slot,
              ) =>
                slot.time ===
                slotTime,
            );

          if (
            existing
          ) {
            existing.items.push(
              appointment,
            );
          } else {
            slots.push({
              time:
                slotTime,

              items: [
                appointment,
              ],
            });
          }
        },
      );

      return (
        <div className="space-y-0">
          {slots.map(
            (
              slot,
            ) => (
              <div
                key={
                  slot.time
                }
                className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-2 md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-3"
              >
                {/* Time */}
                <div className="pt-3 text-right">
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground md:text-[11px]">
                    {slot.time ===
                    '—'
                      ? 'N/A'
                      : formatTime12h(
                          slot.time,
                        )}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative border-l border-border pb-4 pl-3 md:pl-4">
                  <span
                    aria-hidden="true"
                    className="
                      absolute
                      -left-[5px]
                      top-3
                      h-2.5
                      w-2.5
                      rounded-full
                      border-2
                      border-card
                      bg-primary
                      shadow-sm
                    "
                  />

                  <div className="space-y-2">
                    {slot.items.map(
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
                          pendingRescheduleCount={
                            pendingRescheduleMap[
                              appointment.id
                            ] ?? 0
                          }
                          onReschedule={
                            handleRescheduleOpen
                          }
                        >
                          <CustomerCard
                            customerId={
                              appointment.customerId
                            }
                          />

                          <VehicleCard
                            vehicleId={
                              appointment.vehicleId
                            }
                            customerId={
                              appointment.customerId
                            }
                          />

                          {appointment.services &&
                          appointment.services
                            .length >
                            0 ? (
                            appointment.services.map(
                              (
                                service: any,
                              ) => (
                                <ServiceCard
                                  key={
                                    service.id
                                  }
                                  serviceId={
                                    service.id
                                  }
                                />
                              ),
                            )
                          ) : (
                            <div className="text-xs italic text-muted-foreground">
                              No services selected.
                            </div>
                          )}

                          <StaffCards
                            appointmentId={
                              appointment.id
                            }
                          />

                          {appointment.status ===
                            'PENDING' && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  onConfirm(
                                    appointment,
                                  )
                                }
                                className="
                                  h-10
                                  rounded-md
                                  bg-emerald-600
                                  text-xs
                                  font-semibold
                                  text-white
                                  hover:bg-emerald-700
                                  md:h-9
                                "
                              >
                                <CheckCircle className="h-4 w-4" />
                                Confirm
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDeclineOpen(
                                    appointment,
                                  )
                                }
                                className="
                                  h-10
                                  rounded-md
                                  text-xs
                                  font-semibold
                                  text-destructive
                                  hover:bg-destructive/10
                                  md:h-9
                                "
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </AppointmentCard>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      );
    };

  const renderContent =
    () => {
      if (
        activeStatus ===
        'CONFIRMED'
      ) {
        return renderQueue();
      }

      return renderAppointments();
    };

  const currentAppointment =
    rescheduleModal.appointment;

  const selectedDateAppointmentCount =
    appointments.filter(
      (
        appointment,
      ) =>
        appointment.appointmentDate &&
        new Date(
          `${appointment.appointmentDate}T00:00:00`,
        ).toDateString() ===
          selectedDate.toDateString(),
    ).length;

  const selectedDateRescheduleCount =
    appointments.filter(
      (appointment) =>
        appointment.appointmentDate ===
          dateStr &&
        (pendingRescheduleMap[appointment.id] ?? 0) >
          0,
    ).length;

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-border bg-card shadow-sm">
        {/* ========================================================
            HEADER
        ========================================================= */}

        <CardHeader className="shrink-0 border-b border-border px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Clock className="h-4 w-4 shrink-0 text-primary" />

                <span className="truncate">
                  {format(
                    selectedDate,
                    'EEEE, MMMM d',
                  )}
                </span>

                {isToday && (
                  <Badge
                    variant="outline"
                    className="
                      hidden
                      rounded-full
                      border-primary/25
                      bg-primary/10
                      px-2
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-primary
                      sm:inline-flex
                    "
                  >
                    Today
                  </Badge>
                )}
              </CardTitle>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Daily service schedule
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {selectedDateRescheduleCount >
                0 && (
                <Badge
                  variant="outline"
                  className="
                    rounded-full
                    border-blue-500/25
                    bg-blue-500/10
                    px-2.5
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-blue-600
                    dark:text-blue-400
                    animate-pulse
                  "
                >
                  <CalendarClock className="mr-1 h-3 w-3" />

                  {selectedDateRescheduleCount}
                </Badge>
              )}

              <Badge
                variant="secondary"
                className="rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide"
              >
                {activeStatus ===
                'CONFIRMED'
                  ? queue.length
                  : selectedDateAppointmentCount}{' '}
                booked
              </Badge>

              {onRefresh && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={
                    onRefresh
                  }
                  aria-label="Refresh appointments"
                  className="
                    h-9
                    w-9
                    rounded-md
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* ======================================================
              STATUS TABS
          ======================================================= */}

          <div className="mt-3 overflow-hidden rounded-lg bg-muted p-1">
            <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
              {STATUS_TABS.map(
                (
                  tab,
                ) => {
                  const isActive =
                    activeStatus ===
                    tab.value;

                  const count =
                    tab.value ===
                    'ALL'
                      ? selectedDateAppointmentCount
                      : appointments.filter(
                          (
                            appointment,
                          ) =>
                            appointment.appointmentDate &&
                            new Date(
                              `${appointment.appointmentDate}T00:00:00`,
                            ).toDateString() ===
                              selectedDate.toDateString() &&
                            appointment.status ===
                              tab.value,
                        ).length;

                  return (
                    <button
                      type="button"
                      key={
                        tab.value
                      }
                      onClick={() =>
                        setActiveStatus(
                          tab.value,
                        )
                      }
                      className={cn(
                        `
                          h-9
                          shrink-0
                          whitespace-nowrap
                          rounded-md
                          px-2.5
                          text-xs
                          font-medium
                          transition-colors
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-1
                        `,
                        isActive
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {
                        tab.label
                      }

                      <span className="ml-1 opacity-50">
                        (
                        {
                          count
                        }
                        )
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* ======================================================
              SEARCH
          ======================================================= */}

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Filter by customer, plate, or model..."
              value={
                sidebarFilter
              }
              onChange={(
                event,
              ) =>
                setSidebarFilter(
                  event.target.value,
                )
              }
              className="
                h-11
                rounded-md
                pl-10
                text-base
                focus-visible:ring-2
                focus-visible:ring-ring
                md:h-9
                md:text-sm
              "
            />
          </div>
        </CardHeader>

        {/* ========================================================
            SCHEDULE
        ========================================================= */}

        <CardContent className="min-h-0 flex-1 overflow-y-auto p-2.5 md:p-3">
          <div className="rounded-lg border border-border/80 bg-background/40 p-2 md:p-3">
            {renderContent()}
          </div>
        </CardContent>
      </Card>

      {/* ============================================================
          DECLINE APPOINTMENT
      ============================================================= */}

      <Dialog
        open={
          declineModal.open
        }
        onOpenChange={(
          open,
        ) =>
          setDeclineModal({
            ...declineModal,
            open,
          })
        }
      >
        <DialogContent className="rounded-none p-4 sm:max-w-md sm:rounded-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Decline Appointment
            </DialogTitle>

            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              Provide a brief explanation for the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Input
              placeholder="Reason for declining..."
              value={
                declineModal.reason
              }
              onChange={(
                event,
              ) =>
                setDeclineModal({
                  ...declineModal,
                  reason:
                    event.target.value,
                })
              }
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setDeclineModal({
                  open:
                    false,

                  appointment:
                    null,

                  reason:
                    '',
                })
              }
              className="h-11 rounded-md px-4 md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={
                handleDeclineConfirm
              }
              className="h-11 rounded-md px-4 font-semibold md:h-9"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          RESCHEDULE
      ============================================================= */}

      {currentAppointment && (
        <RescheduleRequestModal
          open={
            rescheduleModal.open
          }
          onOpenChange={(
            open,
          ) =>
            setRescheduleModal({
              ...rescheduleModal,
              open,
            })
          }
          appointmentId={
            currentAppointment.id
          }
          currentDate={
            currentAppointment.appointmentDate
          }
          currentTime={
            currentAppointment.appointmentTime
          }
          onSuccess={
            handleRescheduleSuccess
          }
        />
      )}
    </>
  );
}