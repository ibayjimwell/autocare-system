'use client';

import React from 'react';

import {
  CalendarClock,
  Car,
  Clock3,
  UserRound,
  XCircle,
} from 'lucide-react';

import {
  Card,
} from '@/components/ui/card';

import {
  useAppointmentTimeGrid,
} from '@/hooks/appointments/useAppointmentTimeGrid';

interface AppointmentTimeGridProps {
  selectedDate: Date;
  appointments: any[];
}

/* ================================================================
   STATUS COLORS
================================================================ */

const STATUS_COLORS: Record<
  string,
  string
> = {
  PENDING:
    '#EF4444',

  CONFIRMED:
    '#DC2626',

  UNDER_INSPECTION:
    '#3B82F6',

  WAITING_FOR_APPROVAL:
    '#EAB308',

  IN_PROGRESS:
    '#F97316',

  COMPLETED:
    '#22C55E',

  CANCELLED:
    '#6B7280',
};

/* ================================================================
   STATUS HELPERS
================================================================ */

function normalizeStatus(
  value: string,
): string {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function getStatusColor(
  status: string,
): string {
  return (
    STATUS_COLORS[
      normalizeStatus(
        status,
      )
    ] ??
    '#6B7280'
  );
}

function getStatusBackground(
  status: string,
): string {
  const color =
    getStatusColor(
      status,
    );

  switch (color) {
    case '#EF4444':
      return 'rgba(239, 68, 68, 0.10)';

    case '#DC2626':
      return 'rgba(220, 38, 38, 0.10)';

    case '#3B82F6':
      return 'rgba(59, 130, 246, 0.10)';

    case '#EAB308':
      return 'rgba(234, 179, 8, 0.10)';

    case '#F97316':
      return 'rgba(249, 115, 22, 0.10)';

    case '#22C55E':
      return 'rgba(34, 197, 94, 0.10)';

    case '#6B7280':
      return 'rgba(107, 114, 128, 0.10)';

    default:
      return 'rgba(107, 114, 128, 0.10)';
  }
}

function getStatusBorder(
  status: string,
): string {
  const color =
    getStatusColor(
      status,
    );

  switch (color) {
    case '#EF4444':
      return 'rgba(239, 68, 68, 0.28)';

    case '#DC2626':
      return 'rgba(220, 38, 38, 0.28)';

    case '#3B82F6':
      return 'rgba(59, 130, 246, 0.28)';

    case '#EAB308':
      return 'rgba(234, 179, 8, 0.30)';

    case '#F97316':
      return 'rgba(249, 115, 22, 0.28)';

    case '#22C55E':
      return 'rgba(34, 197, 94, 0.28)';

    case '#6B7280':
      return 'rgba(107, 114, 128, 0.28)';

    default:
      return 'rgba(107, 114, 128, 0.28)';
  }
}

function getStatusTextClass(
  status: string,
): string {
  switch (
    normalizeStatus(
      status,
    )
  ) {
    case 'PENDING':
      return 'text-red-800';

    case 'CONFIRMED':
      return 'text-red-800';

    case 'UNDER_INSPECTION':
      return 'text-blue-800';

    case 'WAITING_FOR_APPROVAL':
      return 'text-yellow-800';

    case 'IN_PROGRESS':
      return 'text-orange-800';

    case 'COMPLETED':
      return 'text-green-800';

    case 'CANCELLED':
      return 'text-gray-800';

    default:
      return 'text-foreground';
  }
}

/* ================================================================
   CUSTOMER
================================================================ */

function getCustomerName(
  appointment: any,
): string {
  const customer =
    appointment?.customer ??
    null;

  const directName =
    customer?.fullname ??
    customer?.fullName ??
    customer?.name ??
    appointment?.customerName;

  if (
    directName
  ) {
    return String(
      directName,
    ).trim();
  }

  const firstName =
    customer?.firstName ??
    customer?.first_name ??
    '';

  const lastName =
    customer?.lastName ??
    customer?.last_name ??
    '';

  return (
    `${String(
      firstName,
    ).trim()} ${String(
      lastName,
    ).trim()}`.trim() ||
    'Unnamed Customer'
  );
}

/* ================================================================
   VEHICLE
================================================================ */

function getVehicleLabel(
  appointment: any,
): string {
  const vehicle =
    appointment?.vehicle ??
    null;

  const make =
    vehicle?.make ??
    appointment?.vehicleMake ??
    '';

  const model =
    vehicle?.model ??
    appointment?.vehicleModel ??
    '';

  const plate =
    vehicle?.plateNumber ??
    appointment?.plateNumber ??
    '';

  const vehicleName =
    `${String(
      make,
    ).trim()} ${String(
      model,
    ).trim()}`.trim();

  if (
    vehicleName &&
    plate
  ) {
    return `${vehicleName} · ${plate}`;
  }

  return (
    vehicleName ||
    plate ||
    'Vehicle'
  );
}

/* ================================================================
   SERVICES
================================================================ */

function getServicesLabel(
  appointment: any,
): string {
  if (
    !Array.isArray(
      appointment?.services,
    )
  ) {
    return 'Service appointment';
  }

  const names =
    appointment.services
      .map(
        (service: any) =>
          service?.name ??
          service?.serviceName ??
          service?.title,
      )
      .filter(Boolean)
      .map(String);

  if (
    names.length ===
    0
  ) {
    return 'Service appointment';
  }

  if (
    names.length <=
    2
  ) {
    return names.join(
      ' · ',
    );
  }

  return `${names
    .slice(0, 2)
    .join(' · ')} +${
    names.length - 2
  }`;
}

/* ================================================================
   DURATION
================================================================ */

function getDurationLabel(
  appointment: any,
): string {
  const directCandidates =
    [
      appointment?.durationMinutes,
      appointment?.estimatedDuration,
      appointment?.totalDuration,
    ];

  for (
    const candidate of
      directCandidates
  ) {
    const value =
      Number(candidate);

    if (
      Number.isFinite(
        value,
      ) &&
      value > 0
    ) {
      return `${value} min`;
    }
  }

  if (
    Array.isArray(
      appointment?.services,
    )
  ) {
    const serviceDuration =
      appointment.services.reduce(
        (
          sum: number,
          service: any,
        ) => {
          const duration =
            Number(
              service?.estimatedDuration ??
                service?.durationMinutes ??
                0,
            );

          return Number.isFinite(
            duration,
          )
            ? sum +
                Math.max(
                  0,
                  duration,
                )
            : sum;
        },
        0,
      );

    if (
      serviceDuration >
      0
    ) {
      return `${serviceDuration} min`;
    }
  }

  return '30 min';
}

/* ================================================================
   COMPONENT
================================================================ */

export default function AppointmentTimeGrid({
  selectedDate,
  appointments,
}: AppointmentTimeGridProps) {
  const {
    timeSlots,
    appointmentBlocks,
    openingTime,
    closingTime,
    closedReason,
    gridStartMinutes,
    gridEndMinutes,
    loading,
    error,
    formatTimeLabel,
  } =
    useAppointmentTimeGrid({
      selectedDate,
      appointments,
    });

  const ROW_HEIGHT =
    60;

  const totalMinutes =
    Math.max(
      30,
      gridEndMinutes -
        gridStartMinutes,
    );

  const totalHeight =
    Math.max(
      1,
      totalMinutes /
        30,
    ) *
    ROW_HEIGHT;

  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {
    return (
      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md md:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
              Appointment Time Grid
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Loading the selected day schedule…
            </p>
          </div>
        </div>

        <div className="flex min-h-[260px] items-center justify-center px-4 py-8">
          <div className="w-full max-w-3xl space-y-3">
            {Array.from({
              length: 5,
            }).map(
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ),
            )}
          </div>
        </div>
      </Card>
    );
  }

  /* ==============================================================
     ERROR
  ============================================================== */

  if (
    error
  ) {
    return (
      <Card className="overflow-hidden rounded-xl border-destructive/20 bg-card shadow-sm">
        <div className="flex items-start gap-3 p-4 md:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <XCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Appointment Time Grid
            </h2>

            <p className="mt-1 text-sm leading-5 text-destructive">
              {error}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  /* ==============================================================
     EMPTY
  ============================================================== */

  if (
    timeSlots.length ===
    0
  ) {
    return (
      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 p-4 md:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CalendarClock className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
              Appointment Time Grid
            </h2>

            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {closedReason ||
                'The shop is closed or no time listings are configured for this day.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">

      {/* ==========================================================
          HEADER
      =========================================================== */}

      <div className="border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md md:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                Appointment Time Grid
              </h2>

              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Appointments are shown across their covered time range for the selected calendar day.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">

            {(openingTime ||
              closingTime) && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-primary" />

                <span>
                  {openingTime
                    ? formatTimeLabel(
                        openingTime,
                      )
                    : '—'}{' '}
                  –{' '}
                  {closingTime
                    ? formatTimeLabel(
                        closingTime,
                      )
                    : '—'}
                </span>
              </div>
            )}

            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {
                appointmentBlocks.length
              }{' '}
              appointment
              {appointmentBlocks.length ===
              1
                ? ''
                : 's'}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          GRID
      =========================================================== */}

      <div className="p-3 md:p-4">
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="max-h-[38rem] overflow-y-auto overscroll-contain">
            <div className="grid min-w-[38rem] grid-cols-[76px_minmax(0,1fr)]">

              {/* ==================================================
                  TIME LABELS
              =================================================== */}

              <div className="border-r border-border bg-card">
                <div
                  className="relative"
                  style={{
                    height:
                      totalHeight,
                  }}
                >
                  {timeSlots.map(
                    (
                      slot,
                      index,
                    ) => (
                      <div
                        key={
                          slot.time
                        }
                        className="absolute left-0 right-0 border-t border-border px-2 pt-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
                        style={{
                          top:
                            index *
                            ROW_HEIGHT,
                          height:
                            ROW_HEIGHT,
                        }}
                      >
                        {formatTimeLabel(
                          slot.time,
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* ==================================================
                  APPOINTMENT CANVAS
              =================================================== */}

              <div className="relative overflow-hidden bg-card">
                <div
                  className="relative"
                  style={{
                    height:
                      totalHeight,
                  }}
                >

                  {/* SLOT GRID */}

                  {timeSlots.map(
                    (
                      slot,
                      index,
                    ) => (
                      <div
                        key={`line-${slot.time}`}
                        className="absolute left-0 right-0 border-t border-border"
                        style={{
                          top:
                            index *
                            ROW_HEIGHT,
                        }}
                        aria-hidden="true"
                      />
                    ),
                  )}

                  {/* HALF HOUR */}

                  {timeSlots.map(
                    (
                      slot,
                      index,
                    ) => {
                      const currentMinutes =
                        parseInt(
                          slot.time.slice(
                            0,
                            2,
                          ),
                          10,
                        ) *
                          60 +
                        parseInt(
                          slot.time.slice(
                            3,
                            5,
                          ),
                          10,
                        );

                      const nextMinutes =
                        currentMinutes +
                        30;

                      return (
                        nextMinutes <
                          gridEndMinutes && (
                          <div
                            key={`subline-${slot.time}`}
                            className="absolute left-0 right-0 border-t border-border/40"
                            style={{
                              top:
                                index *
                                  ROW_HEIGHT +
                                ROW_HEIGHT /
                                  2,
                            }}
                            aria-hidden="true"
                          />
                        )
                      );
                    },
                  )}

                  {/* =================================================
                      APPOINTMENTS
                  ================================================== */}

                  {appointmentBlocks.map(
                    block => {
                      const status =
                        String(
                          block
                            .appointment
                            ?.status ??
                            '',
                        )
                          .trim()
                          .toUpperCase();

                      const backgroundColor =
                        getStatusBackground(
                          status,
                        );

                      const borderColor =
                        getStatusBorder(
                          status,
                        );

                      const accentColor =
                        getStatusColor(
                          status,
                        );

                      const top =
                        ((block.startMinutes -
                          gridStartMinutes) /
                          30) *
                        ROW_HEIGHT;

                      const height =
                        Math.max(
                          ROW_HEIGHT *
                            0.8,
                          ((block.endMinutes -
                            block.startMinutes) /
                            30) *
                            ROW_HEIGHT -
                            6,
                        );

                      const leftPercent =
                        (block.column /
                          block.columns) *
                        100;

                      const widthPercent =
                        100 /
                        block.columns;

                      const textClass =
                        getStatusTextClass(
                          status,
                        );

                      return (
                        <div
                          key={
                            block.id
                          }
                          className={`
                            absolute
                            overflow-hidden
                            rounded-lg
                            border
                            shadow-sm
                            transition-shadow
                            hover:shadow-md
                            ${textClass}
                          `}
                          style={{
                            top:
                              top + 3,

                            height,

                            left: `calc(${leftPercent}% + 4px)`,

                            width: `calc(${widthPercent}% - 8px)`,

                            backgroundColor,

                            borderColor,
                          }}
                        >

                          {/* Status accent */}

                          <div
                            className="absolute inset-y-0 left-0 w-1"
                            style={{
                              backgroundColor:
                                accentColor,
                            }}
                            aria-hidden="true"
                          />

                          <div className="flex h-full min-w-0 flex-col p-2 pl-3">

                            <div className="flex min-w-0 items-start justify-between gap-2">

                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-bold leading-4 text-foreground">
                                  {getCustomerName(
                                    block.appointment,
                                  )}
                                </p>

                                <p className="mt-0.5 truncate text-[9px] font-medium text-foreground/70">
                                  #
                                  {block.appointment?.trackingNumber ??
                                    '—'}
                                </p>
                              </div>

                              <span
                                className="
                                  shrink-0
                                  rounded-full
                                  bg-white/60
                                  px-1.5
                                  py-0.5
                                  text-[8px]
                                  font-bold
                                  uppercase
                                  tracking-wide
                                  text-foreground
                                "
                              >
                                {status
                                  .replace(
                                    /_/g,
                                    ' ',
                                  )}
                              </span>
                            </div>

                            <div className="mt-1.5 min-w-0 space-y-1">

                              <div className="flex min-w-0 items-center gap-1">
                                <Car className="h-3 w-3 shrink-0 opacity-70" />

                                <span className="truncate text-[9px] font-medium text-foreground">
                                  {getVehicleLabel(
                                    block.appointment,
                                  )}
                                </span>
                              </div>

                              <div className="flex min-w-0 items-center gap-1">
                                <UserRound className="h-3 w-3 shrink-0 opacity-70" />

                                <span className="truncate text-[9px] font-medium text-foreground">
                                  {getServicesLabel(
                                    block.appointment,
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Clock3 className="h-3 w-3 shrink-0 opacity-70" />

                                <span className="text-[9px] font-semibold text-foreground">
                                  {formatTimeLabel(
                                    block
                                      .appointment
                                      ?.appointmentTime ??
                                      '',
                                  )}{' '}
                                  ·{' '}
                                  {getDurationLabel(
                                    block.appointment,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}

                  {/* EMPTY GRID */}

                  {appointmentBlocks.length ===
                    0 && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <div className="max-w-sm">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <CalendarClock className="h-5 w-5" />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-foreground">
                          No appointments scheduled
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          The time grid is ready for this day's appointments.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          LEGEND
      =========================================================== */}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 md:px-5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </span>

        {[
          [
            '#EF4444',
            'Pending',
          ],
          [
            '#DC2626',
            'Confirmed',
          ],
          [
            '#3B82F6',
            'Under Inspection',
          ],
          [
            '#EAB308',
            'Waiting for Approval',
          ],
          [
            '#F97316',
            'In Progress',
          ],
          [
            '#22C55E',
            'Completed',
          ],
          [
            '#6B7280',
            'Cancelled',
          ],
        ].map(
          ([
            color,
            label,
          ]) => (
            <div
              key={
                label
              }
              className="flex items-center gap-1.5"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    color,
                }}
              />

              <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                {label}
              </span>
            </div>
          ),
        )}
      </div>
    </Card>
  );
}