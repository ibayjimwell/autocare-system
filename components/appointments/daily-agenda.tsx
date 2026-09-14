'use client';

import React, {
  useMemo,
  useState,
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
  AlertTriangle,
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

/* ================================================================
   TYPES
================================================================ */

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

  pendingRescheduleMap?: Record<
    string,
    number
  >;
}

/* ================================================================
   STATUS TABS
================================================================ */

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

/* ================================================================
   CANCELLABLE STATUSES
================================================================ */

const CANCELLABLE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
] as const;

/* ================================================================
   COMPONENT
================================================================ */

export default function DailyAgenda({
  appointments,
  selectedDate,
  onConfirm,
  onDecline,
  onRefresh,
  pendingRescheduleMap = {},
}: DailyAgendaProps) {
  /* ==============================================================
     FILTER STATE
  ============================================================== */

  const [
    sidebarFilter,
    setSidebarFilter,
  ] = useState('');

  const [
    activeStatus,
    setActiveStatus,
  ] = useState('ALL');

  /* ==============================================================
     DECLINE MODAL
  ============================================================== */

  const [
    declineModal,
    setDeclineModal,
  ] =
    useState<{
      open: boolean;
      appointment: any | null;
      reason: string;
    }>({
      open: false,

      appointment:
        null,

      reason:
        '',
    });

  /* ==============================================================
     RESCHEDULE MODAL
  ============================================================== */

  const [
    rescheduleModal,
    setRescheduleModal,
  ] =
    useState<{
      open: boolean;
      appointment: any | null;
    }>({
      open: false,

      appointment:
        null,
    });

  /* ==============================================================
     CANCEL MODAL
  ============================================================== */

  const [
    cancelModal,
    setCancelModal,
  ] =
    useState<{
      open: boolean;
      appointment: any | null;
      reason: string;
      loading: boolean;
    }>({
      open: false,

      appointment:
        null,

      reason:
        '',

      loading:
        false,
    });

  /* ==============================================================
     DATE
  ============================================================== */

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

  /* ==============================================================
     SERVICE QUEUE
  ============================================================== */

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

  /* ==============================================================
     FILTER APPOINTMENTS
  ============================================================== */

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
        !declineModal.appointment
      ) {
        return;
      }

      const reason =
        declineModal.reason.trim();

      if (
        !reason
      ) {
        return;
      }

      onDecline(
        declineModal.appointment,
        reason,
      );

      setDeclineModal({
        open:
          false,

        appointment:
          null,

        reason:
          '',
      });
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
     CANCEL APPOINTMENT
  ================================================================= */

  const canCancelAppointment =
    (
      appointment: any,
    ) =>
      !!appointment &&
      CANCELLABLE_STATUSES.includes(
        appointment.status,
      );

  /* ----------------------------------------------------------------
     OPEN CANCEL MODAL
  ---------------------------------------------------------------- */

  const handleCancelOpen =
    (
      appointment: any,
    ) => {
      if (
        !canCancelAppointment(
          appointment,
        )
      ) {
        return;
      }

      setCancelModal({
        open:
          true,

        appointment,

        reason:
          '',

        loading:
          false,
      });
    };

  /* ----------------------------------------------------------------
     CLOSE CANCEL MODAL
  ---------------------------------------------------------------- */

  const handleCancelClose =
    () => {
      if (
        cancelModal.loading
      ) {
        return;
      }

      setCancelModal({
        open:
          false,

        appointment:
          null,

        reason:
          '',

        loading:
          false,
      });
    };

  /* ----------------------------------------------------------------
     CONFIRM CANCEL
  ---------------------------------------------------------------- */

  const handleCancelConfirm =
    async () => {
      const appointment =
        cancelModal.appointment;

      const reason =
        cancelModal.reason.trim();

      if (
        !appointment
      ) {
        return;
      }

      if (
        !canCancelAppointment(
          appointment,
        )
      ) {
        return;
      }

      if (
        !reason
      ) {
        return;
      }

      /*
       * The parent page performs the actual API update so
       * appointment data and the realtime page state remain
       * centralized there.
       */
      setCancelModal(
        (
          previous,
        ) => ({
          ...previous,

          loading:
            true,
        }),
      );

      try {
        /*
         * The cancellation callback is intentionally awaitable.
         *
         * DailyAgenda supports both:
         *
         *   async callbacks
         *   synchronous callbacks
         *
         * so existing parents continue to work.
         */
        await onDecline(
          appointment,
          reason,
        );
      } finally {
        setCancelModal({
          open:
            false,

          appointment:
            null,

          reason:
            '',

          loading:
            false,
        });
      }
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
                {/* ==================================================
                    TIME
                =================================================== */}

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

                {/* ==================================================
                    TIMELINE
                =================================================== */}

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
                          {/* =========================================
                              CUSTOMER
                          ========================================== */}

                          <CustomerCard
                            customerId={
                              appointment.customerId
                            }
                          />

                          {/* =========================================
                              VEHICLE
                          ========================================== */}

                          <VehicleCard
                            vehicleId={
                              appointment.vehicleId
                            }
                            customerId={
                              appointment.customerId
                            }
                          />

                          {/* =========================================
                              SERVICES
                          ========================================== */}

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

                          {/* =========================================
                              STAFF
                          ========================================== */}

                          <StaffCards
                            appointmentId={
                              appointment.id
                            }
                          />

                          {/* =========================================
                              PENDING ACTIONS
                          ========================================== */}

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

                          {/* =========================================
                              CANCEL APPOINTMENT

                              Available for:
                                PENDING
                                CONFIRMED
                                UNDER_INSPECTION
                                WAITING_FOR_APPROVAL
                                IN_PROGRESS
                          ========================================== */}

                          {canCancelAppointment(
                            appointment,
                          ) && (
                            <div
                              className="
                                mt-2
                                border-t
                                border-border
                                pt-2
                              "
                            >
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  handleCancelOpen(
                                    appointment,
                                  )
                                }
                                disabled={
                                  cancelModal.loading
                                }
                                className="
                                  h-10
                                  w-full
                                  rounded-md
                                  border-destructive/20
                                  text-xs
                                  font-semibold
                                  text-destructive
                                  hover:border-destructive/30
                                  hover:bg-destructive/10
                                  hover:text-destructive
                                  focus-visible:outline-none
                                  focus-visible:ring-2
                                  focus-visible:ring-destructive/30
                                  focus-visible:ring-offset-2
                                  md:h-9
                                "
                              >
                                <XCircle className="mr-2 h-4 w-4" />

                                Cancel Appointment
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

  /* ================================================================
     CONTENT
  ================================================================= */

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

  /* ================================================================
     RESCHEDULE APPOINTMENT
  ================================================================= */

  const currentAppointment =
    rescheduleModal.appointment;

  /* ================================================================
     DATE COUNTS
  ================================================================= */

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

  /* ================================================================
     CANCEL MODAL DATA
  ================================================================= */

  const cancelAppointment =
    cancelModal.appointment;

  const cancelReason =
    cancelModal.reason.trim();

  const cancelReasonValid =
    cancelReason.length >=
    3;

  /* ================================================================
     RENDER
  ================================================================= */

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
                    animate-pulse
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
                  "
                >
                  <CalendarClock className="mr-1 h-3 w-3" />

                  {
                    selectedDateRescheduleCount
                  }
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
        ) => {
          if (
            !open
          ) {
            setDeclineModal({
              open:
                false,

              appointment:
                null,

              reason:
                '',
            });
          }
        }}
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
                setDeclineModal(
                  (
                    previous,
                  ) => ({
                    ...previous,

                    reason:
                      event.target
                        .value,
                  }),
                )
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
              disabled={
                !declineModal.reason.trim()
              }
              className="h-11 rounded-md px-4 font-semibold md:h-9"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          CANCEL APPOINTMENT
      ============================================================= */}

      <Dialog
        open={
          cancelModal.open
        }
        onOpenChange={(
          open,
        ) => {
          if (
            !open &&
            !cancelModal.loading
          ) {
            handleCancelClose();
          }
        }}
      >
        <DialogContent
          className="
            max-h-[calc(100dvh-1rem)]
            w-[calc(100vw-1rem)]
            overflow-y-auto
            rounded-xl
            p-4

            sm:max-w-lg
            sm:p-6
          "
        >
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 text-lg font-semibold tracking-tight">
              <span
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-destructive/10
                "
              >
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </span>

              <span className="min-w-0 flex-1">
                Cancel Appointment
              </span>
            </DialogTitle>

            <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
              Are you sure you want to cancel this appointment?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {/* ======================================================
              APPOINTMENT INFORMATION
          ======================================================= */}

          {cancelAppointment && (
            <div
              className="
                rounded-lg
                border
                border-border
                bg-muted/20
                p-4
              "
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Tracking Number
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      uppercase
                      tracking-wide
                      text-foreground
                    "
                  >
                    #
                    {
                      cancelAppointment.trackingNumber
                    }
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Current Status
                  </p>

                  <Badge
                    variant="outline"
                    className="
                      mt-1
                      rounded-full
                      border-primary/20
                      bg-primary/5
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-primary
                    "
                  >
                    {String(
                      cancelAppointment.status ||
                        '',
                    ).replace(
                      /_/g,
                      ' ',
                    )}
                  </Badge>
                </div>

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Appointment Date
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-medium
                      text-foreground
                    "
                  >
                    {cancelAppointment.appointmentDate
                      ? format(
                          new Date(
                            `${cancelAppointment.appointmentDate}T00:00:00`,
                          ),
                          'MMMM d, yyyy',
                        )
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Appointment Time
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-medium
                      tabular-nums
                      text-foreground
                    "
                  >
                    {cancelAppointment.appointmentTime
                      ? formatTime12h(
                          cancelAppointment.appointmentTime,
                        )
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================
              WARNING
          ======================================================= */}

          <div
            className="
              flex
              items-start
              gap-3
              rounded-lg
              border
              border-destructive/20
              bg-destructive/5
              p-3
            "
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

            <div className="min-w-0">
              <p className="text-xs font-semibold text-destructive">
                This cannot be undone.
              </p>

              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                The appointment will immediately change to
                CANCELLED. Confirmed appointments will also be
                removed from the service queue.
              </p>
            </div>
          </div>

          {/* ======================================================
              REASON
          ======================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="cancel-appointment-reason"
              className="
                block
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-muted-foreground
              "
            >
              Cancellation Reason
            </label>

            <textarea
              id="cancel-appointment-reason"
              value={
                cancelModal.reason
              }
              onChange={(
                event,
              ) =>
                setCancelModal(
                  (
                    previous,
                  ) => ({
                    ...previous,

                    reason:
                      event.target.value,
                  }),
                )
              }
              placeholder="Enter the reason for cancelling this appointment..."
              disabled={
                cancelModal.loading
              }
              maxLength={
                500
              }
              rows={
                5
              }
              className="
                flex
                min-h-[120px]
                w-full
                resize-y
                rounded-md
                border
                border-input
                bg-background
                px-3
                py-2
                text-base
                text-foreground
                shadow-sm
                outline-none
                transition-colors

                placeholder:text-muted-foreground

                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2

                disabled:cursor-not-allowed
                disabled:opacity-50

                md:text-sm
              "
            />

            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] leading-5 text-muted-foreground">
                A cancellation reason is required for audit history
                and customer communication.
              </p>

              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {
                  cancelModal.reason.length
                }
                /500
              </span>
            </div>

            {cancelModal.reason.length >
              0 &&
              !cancelReasonValid && (
                <p className="text-xs font-medium text-destructive">
                  Please enter at least 3 characters.
                </p>
              )}
          </div>

          {/* ======================================================
              FOOTER
          ======================================================= */}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={
                handleCancelClose
              }
              disabled={
                cancelModal.loading
              }
              className="
                h-11
                rounded-md
                px-4
                text-sm
                font-medium

                md:h-9
              "
            >
              Keep Appointment
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={
                handleCancelConfirm
              }
              disabled={
                cancelModal.loading ||
                !cancelReasonValid
              }
              className="
                h-11
                rounded-md
                px-4
                text-sm
                font-semibold

                md:h-9
              "
            >
              {cancelModal.loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />

                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />

                  Cancel Appointment
                </>
              )}
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