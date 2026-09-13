'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  addMonths,
  format,
} from 'date-fns';

import { toast } from 'sonner';

import {
  Settings,
  XCircle,
  CalendarDays,
  RefreshCw,
  Search,
  X,
  Filter,
  AlertCircle,
} from 'lucide-react';

import PageContainer from '@/components/shared/page-container';
import ErrorHandler from '@/components/shared/error-handler';
import AppointmentCalendar from '@/components/appointments/appointment-calendar';
import AppointmentsSkeleton from '@/components/skeleton/appointments-skeleton';
import BookingFormCard from '@/components/appointments/booking-form-card';
import DailyAgenda from '@/components/appointments/daily-agenda';
import AppointmentCard from '@/components/appointments/appointment-card';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GlobalConfigModal } from '@/components/configurations/global-config-modal';
import { DateConfigModal } from '@/components/configurations/date-config-modal';

import { useAppointmentData } from '@/hooks/appointments/useAppointmentData';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { useAuth } from '@/lib/auth/staffs/useAuth';
import { useConfigurations } from '@/hooks/configurations/useConfigurations';
import { getEffectiveConfigForDate } from '@/utils/configurations';
import { usePendingRescheduleRequests } from '@/hooks/appointments/usePendingRescheduleRequests';

/* ================================================================
   SEARCH TYPES
================================================================ */

type AppointmentSearchCategory =
  | 'ALL'
  | 'TRACKING_NUMBER'
  | 'CUSTOMER'
  | 'VEHICLE'
  | 'DATE'
  | 'STATUS'
  | 'SERVICE';

const SEARCH_CATEGORY_LABELS: Record<
  AppointmentSearchCategory,
  string
> = {
  ALL: 'All fields',
  TRACKING_NUMBER: 'Tracking number',
  CUSTOMER: 'Customer',
  VEHICLE: 'Vehicle',
  DATE: 'Appointment date',
  STATUS: 'Status',
  SERVICE: 'Service',
};

const SEARCH_CATEGORY_DESCRIPTIONS: Record<
  AppointmentSearchCategory,
  string
> = {
  ALL:
    'Search across tracking number, customer, vehicle, date, status, and service.',
  TRACKING_NUMBER:
    'Find an appointment directly using its tracking number.',
  CUSTOMER:
    'Search by customer name, phone number, or email address.',
  VEHICLE:
    'Search by vehicle make, model, year, or plate number.',
  DATE:
    'Find appointments scheduled on a specific appointment date.',
  STATUS:
    'Find appointments by their current status.',
  SERVICE:
    'Find appointments containing a specific service.',
};

const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'UNDER_INSPECTION',
  'WAITING_FOR_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

/* ================================================================
   SEARCH HELPERS
================================================================ */

function normalizeSearchValue(
  value: unknown,
): string {
  return String(
    value ?? '',
  )
    .trim()
    .toLowerCase();
}

/* ----------------------------------------------------------------
   CUSTOMER
---------------------------------------------------------------- */

function getCustomerSearchText(
  appointment: any,
): string {
  return [
    appointment?.customer?.fullname,
    appointment?.customer?.name,
    appointment?.customerName,
    appointment?.customer?.phone,
    appointment?.customer?.email,
  ]
    .filter(Boolean)
    .join(' ');
}

/* ----------------------------------------------------------------
   VEHICLE
---------------------------------------------------------------- */

function getVehicleSearchText(
  appointment: any,
): string {
  return [
    appointment?.vehicle?.make,
    appointment?.vehicle?.model,
    appointment?.vehicle?.year,
    appointment?.vehicle?.plateNumber,
    appointment?.vehicle?.plate,
    appointment?.vehicle?.licensePlate,

    appointment?.vehicleMake,
    appointment?.vehicleModel,
    appointment?.plateNumber,
  ]
    .filter(Boolean)
    .join(' ');
}

/* ----------------------------------------------------------------
   SERVICE
---------------------------------------------------------------- */

function getServiceSearchText(
  appointment: any,
): string {
  if (
    !Array.isArray(
      appointment?.services,
    )
  ) {
    return '';
  }

  return appointment.services
    .map(
      (service: any) =>
        [
          service?.name,
          service?.serviceName,
          service?.title,
        ]
          .filter(Boolean)
          .join(' '),
    )
    .filter(Boolean)
    .join(' ');
}

/* ----------------------------------------------------------------
   STATUS
---------------------------------------------------------------- */

function getStatusSearchText(
  appointment: any,
): string {
  return String(
    appointment?.status ?? '',
  )
    .replace(
      /_/g,
      ' ',
    )
    .trim();
}

/* ----------------------------------------------------------------
   DATE
---------------------------------------------------------------- */

function getAppointmentDateSearchText(
  appointment: any,
): string {
  const rawDate =
    appointment?.appointmentDate;

  if (!rawDate) {
    return '';
  }

  const values: string[] = [
    String(rawDate),
  ];

  try {
    const parsedDate =
      new Date(
        `${rawDate}T00:00:00`,
      );

    if (
      !Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      values.push(
        format(
          parsedDate,
          'MMMM d, yyyy',
        ),
      );

      values.push(
        format(
          parsedDate,
          'MMM d, yyyy',
        ),
      );

      values.push(
        format(
          parsedDate,
          'MM/dd/yyyy',
        ),
      );
    }
  } catch {
    // Keep raw date.
  }

  return values.join(' ');
}

/* ----------------------------------------------------------------
   ALL SEARCHABLE VALUES
---------------------------------------------------------------- */

function getAllSearchText(
  appointment: any,
): string {
  return [
    appointment?.trackingNumber,
    appointment?.id,

    getCustomerSearchText(
      appointment,
    ),

    getVehicleSearchText(
      appointment,
    ),

    getAppointmentDateSearchText(
      appointment,
    ),

    getStatusSearchText(
      appointment,
    ),

    getServiceSearchText(
      appointment,
    ),

    appointment?.notes,
  ]
    .filter(Boolean)
    .join(' ');
}

/* ================================================================
   APPOINTMENT PAGE
================================================================ */

export default function AppointmentsPage() {
  /* ==============================================================
     CALENDAR STATE
  ============================================================== */

  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    new Date(),
  );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    new Date(),
  );

  /* ==============================================================
     CONFIGURATION STATE

     UNCHANGED.
  ============================================================== */

  const [
    globalConfigOpen,
    setGlobalConfigOpen,
  ] = useState(false);

  const [
    dateConfigOpen,
    setDateConfigOpen,
  ] = useState(false);

  /* ==============================================================
     SEARCH STATE
  ============================================================== */

  const [
    searchCategory,
    setSearchCategory,
  ] =
    useState<AppointmentSearchCategory>(
      'ALL',
    );

  const [
    searchValue,
    setSearchValue,
  ] = useState('');

  /* ==============================================================
     AUTH
  ============================================================== */

  const {
    hasPermission,
  } = useAuth();

  const canConfigure =
    hasPermission(
      'appointments',
    );

  /* ==============================================================
     CONFIGURATION

     UNCHANGED.
  ============================================================== */

  const {
    config,
  } = useConfigurations();

  const closedDates =
    config
      ? Object.entries(
          config.dateOverrides,
        )
          .filter(
            ([
              _,
              override,
            ]) =>
              override.isOpen ===
              false,
          )
          .map(
            ([
              date,
            ]) => date,
          )
      : [];

  const selectedDateStr =
    format(
      selectedDate,
      'yyyy-MM-dd',
    );

  const effective =
    config
      ? getEffectiveConfigForDate(
          config,
          selectedDateStr,
        )
      : null;

  const isSelectedDateClosed =
    effective
      ? !effective.isOpen
      : false;

  /* ==============================================================
     APPOINTMENT DATA
  ============================================================== */

  const {
    appointments,
    initialLoading,
    customers,
    services,
    apiError,
    loadAppointments,
  } =
    useAppointmentData();

  /* ==============================================================
     PENDING RESCHEDULE REQUESTS

     Fetch all pending reschedule indicators with ONE batch request.
     The map is shared by the calendar, agenda, and search results.
  ============================================================== */

  const appointmentIds = useMemo(
    () =>
      Array.from(
        new Set(
          appointments
            .map((appointment) => appointment?.id)
            .filter(
              (id): id is string =>
                typeof id === 'string' && id.trim().length > 0,
            ),
        ),
      ),
    [appointments],
  );

  const {
    pendingMap: pendingRescheduleMap,
    refresh: refreshPendingReschedules,
  } = usePendingRescheduleRequests(appointmentIds);

  /* ==============================================================
     SEARCH STATE
  ============================================================== */

  const normalizedSearchValue =
    normalizeSearchValue(
      searchValue,
    );

  const hasSearch =
    searchValue.trim().length >
    0;

  /* ==============================================================
     FILTER APPOINTMENTS
  ============================================================== */

  const filteredAppointments =
    useMemo(() => {
      /*
       * No active search.
       */
      if (
        !normalizedSearchValue
      ) {
        return [];
      }

      return appointments.filter(
        (
          appointment,
        ) => {
          switch (
            searchCategory
          ) {
            /* ====================================================
               TRACKING NUMBER
            ==================================================== */

            case 'TRACKING_NUMBER': {
              const trackingNumber =
                normalizeSearchValue(
                  appointment?.trackingNumber,
                );

              return trackingNumber.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               CUSTOMER
            ==================================================== */

            case 'CUSTOMER': {
              const customer =
                normalizeSearchValue(
                  getCustomerSearchText(
                    appointment,
                  ),
                );

              return customer.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               VEHICLE
            ==================================================== */

            case 'VEHICLE': {
              const vehicle =
                normalizeSearchValue(
                  getVehicleSearchText(
                    appointment,
                  ),
                );

              return vehicle.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               DATE
            ==================================================== */

            case 'DATE': {
              const appointmentDate =
                normalizeSearchValue(
                  getAppointmentDateSearchText(
                    appointment,
                  ),
                );

              return appointmentDate.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               STATUS
            ==================================================== */

            case 'STATUS': {
              const status =
                normalizeSearchValue(
                  getStatusSearchText(
                    appointment,
                  ),
                );

              return status.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               SERVICE
            ==================================================== */

            case 'SERVICE': {
              const service =
                normalizeSearchValue(
                  getServiceSearchText(
                    appointment,
                  ),
                );

              return service.includes(
                normalizedSearchValue,
              );
            }

            /* ====================================================
               ALL
            ==================================================== */

            case 'ALL':
            default: {
              const allValues =
                normalizeSearchValue(
                  getAllSearchText(
                    appointment,
                  ),
                );

              return allValues.includes(
                normalizedSearchValue,
              );
            }
          }
        },
      );
    }, [
      appointments,
      normalizedSearchValue,
      searchCategory,
    ]);

  /* ==============================================================
     SEARCH RESULT COUNT
  ============================================================== */

  const searchResultCount =
    filteredAppointments.length;

  const hasSearchResults =
    hasSearch &&
    searchResultCount >
      0;

  /* ==============================================================
     SEARCH PLACEHOLDER
  ============================================================== */

  const searchPlaceholder =
    useMemo(() => {
      switch (
        searchCategory
      ) {
        case 'TRACKING_NUMBER':
          return 'Enter tracking number...';

        case 'CUSTOMER':
          return 'Search customer name, phone or email...';

        case 'VEHICLE':
          return 'Search make, model, year or plate number...';

        case 'DATE':
          return '';

        case 'STATUS':
          return 'Choose an appointment status...';

        case 'SERVICE':
          return 'Search service name...';

        case 'ALL':
        default:
          return 'Search tracking number, customer, vehicle, date, status or service...';
      }
    }, [
      searchCategory,
    ]);

  /* ==============================================================
     SEARCH CATEGORY CHANGE
  ============================================================== */

  const handleSearchCategoryChange =
    (
      value: string,
    ) => {
      setSearchCategory(
        value as AppointmentSearchCategory,
      );

      /*
       * Clear the previous search value because changing the
       * category should start a fresh search.
       */
      setSearchValue('');
    };

  /* ==============================================================
     CLEAR SEARCH
  ============================================================== */

  const clearSearch =
    () => {
      setSearchValue('');

      setSearchCategory(
        'ALL',
      );
    };

  /* ==============================================================
     VIEW SEARCH RESULT IN SCHEDULE
  ============================================================== */

  const handleViewSearchResult =
    (
      appointment: any,
    ) => {
      const rawDate =
        appointment?.appointmentDate;

      if (
        rawDate
      ) {
        const appointmentDate =
          new Date(
            `${rawDate}T00:00:00`,
          );

        if (
          !Number.isNaN(
            appointmentDate.getTime(),
          )
        ) {
          /*
           * Move the scheduler to the appointment's date.
           */
          setSelectedDate(
            appointmentDate,
          );

          setCurrentMonth(
            appointmentDate,
          );
        }
      }

      /*
       * Return to the normal scheduler after the user selects
       * the appointment.
       */
      clearSearch();
    };

  /* ==============================================================
     AUTOMATIC DATE NAVIGATION FOR A UNIQUE SEARCH RESULT
  ============================================================== */

  useEffect(() => {
    if (
      !hasSearch ||
      filteredAppointments.length !==
        1
    ) {
      return;
    }

    const matchedAppointment =
      filteredAppointments[0];

    const rawDate =
      matchedAppointment?.appointmentDate;

    if (!rawDate) {
      return;
    }

    const targetDate =
      new Date(
        `${rawDate}T00:00:00`,
      );

    if (
      Number.isNaN(
        targetDate.getTime(),
      )
    ) {
      return;
    }

    setSelectedDate(
      targetDate,
    );

    setCurrentMonth(
      targetDate,
    );
  }, [
    hasSearch,
    filteredAppointments,
  ]);

  /* ==============================================================
     CONFIRM APPOINTMENT

     EXISTING BUSINESS LOGIC PRESERVED.
  ============================================================== */

  const handleConfirm =
    async (
      appt: any,
    ) => {
      try {
        const res =
          await appointmentsApi.updateStatus(
            appt.id,
            'CONFIRMED',
          );

        if (
          res.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to confirm.',
          );
        } else {
          toast.success(
            'Appointment confirmed.',
          );

          await loadAppointments();
          await refreshPendingReschedules();
        }
      } catch (
        err: any
      ) {
        toast.error(
          err.message ||
            'Error confirming.',
        );
      }
    };

  /* ==============================================================
     DECLINE APPOINTMENT

     EXISTING BUSINESS LOGIC PRESERVED.
  ============================================================== */

  const handleDecline =
    async (
      appointment: any,
      reason: string,
    ) => {
      if (
        !reason.trim()
      ) {
        toast.error(
          'Please provide a reason.',
        );

        return;
      }

      try {
        const res =
          await appointmentsApi.updateStatus(
            appointment.id,
            'CANCELLED',
            reason.trim(),
          );

        if (
          res.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to decline.',
          );
        } else {
          toast.success(
            'Appointment declined.',
          );

          await loadAppointments();
          await refreshPendingReschedules();
        }
      } catch (
        err: any
      ) {
        toast.error(
          err.message ||
            'Error declining.',
        );
      }
    };

  /* ==============================================================
     INITIAL LOADING
  ============================================================== */

  if (
    initialLoading
  ) {
    return (
      <PageContainer
        title="Service Scheduler"
        subtitle="Confirm or decline customer bookings"
      >
        <AppointmentsSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Service Scheduler"
      subtitle="Confirm or decline customer bookings"
    >
      <div className="space-y-4 md:space-y-5 lg:space-y-6">
        {/* ========================================================
            API ERROR
        ========================================================= */}

        {apiError && (
          <ErrorHandler
            type={
              apiError.type
            }
            title={
              apiError.title
            }
            message={
              apiError.message
            }
          />
        )}

        {/* ========================================================
            WORKSPACE HEADER
        ========================================================= */}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-primary/10
                text-primary
              "
            >
              <CalendarDays className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Appointment Workspace
              </p>

              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(
                    selectedDate,
                    'EEEE, MMMM d, yyyy',
                  )}
                </span>

                {isSelectedDateClosed ? (
                  <Badge
                    variant="outline"
                    className="
                      rounded-full
                      border-destructive/30
                      bg-destructive/10
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-destructive
                    "
                  >
                    Closed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="
                      rounded-full
                      border-primary/25
                      bg-primary/10
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-primary
                    "
                  >
                    Open for booking
                  </Badge>
                )}

                {hasSearch && (
                  <Badge
                    variant="secondary"
                    className="
                      rounded-full
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                    "
                  >
                    {searchResultCount}{' '}
                    result
                    {searchResultCount ===
                    1
                      ? ''
                      : 's'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================
              HEADER ACTIONS
          ======================================================= */}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadAppointments()
              }
              className="
                h-11
                rounded-md
                px-4
                text-base
                font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2

                md:h-9
                md:px-3
                md:text-sm
              "
            >
              <RefreshCw className="mr-2 h-5 w-5 md:h-4 md:w-4" />

              Refresh
            </Button>

            {canConfigure && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setGlobalConfigOpen(
                    true,
                  )
                }
                className="
                  h-11
                  rounded-md
                  px-4
                  text-base
                  font-medium
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2

                  md:h-9
                  md:px-3
                  md:text-sm
                "
              >
                <Settings className="mr-2 h-5 w-5 md:h-4 md:w-4" />

                Configure
              </Button>
            )}
          </div>
        </div>

        {/* ========================================================
            SEARCH PANEL
        ========================================================= */}

        <Card
          className="
            overflow-hidden
            rounded-xl
            border-border
            bg-card
            shadow-sm
          "
        >
          {/* --------------------------------------------------------
              SEARCH PANEL HEADER
          --------------------------------------------------------- */}

          <div
            className="
              border-b
              border-border
              bg-background/80
              px-4
              py-4
              backdrop-blur-md

              md:px-6
              md:py-5

              lg:px-7
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-primary/10
                  text-primary
                "
              >
                <Search className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                  Find an Appointment
                </h2>

                <p className="mt-0.5 text-xs leading-5 text-muted-foreground md:text-sm">
                  Quickly locate an appointment using its tracking number or another appointment field.
                </p>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------
              SEARCH CONTROLS
          --------------------------------------------------------- */}

          <div className="space-y-4 p-4 md:p-6 lg:p-7">
            <div
              className="
                grid
                grid-cols-1
                gap-3

                lg:grid-cols-[minmax(0,1fr)_250px]
              "
            >
              {/* ====================================================
                  SEARCH INPUT
              ==================================================== */}

              <div className="min-w-0">
                <label
                  htmlFor="appointment-search"
                  className="
                    mb-2
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  <Search className="h-3.5 w-3.5" />

                  Search
                </label>

                <div className="relative">
                  <Search
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      h-5
                      w-5
                      -translate-y-1/2
                      text-muted-foreground

                      md:h-4
                      md:w-4
                    "
                  />

                  {searchCategory ===
                  'DATE' ? (
                    <Input
                      id="appointment-search"
                      type="date"
                      value={
                        searchValue
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearchValue(
                          event.target
                            .value,
                        )
                      }
                      aria-label="Search appointments by date"
                      className="
                        h-11
                        w-full
                        rounded-md
                        border-input
                        bg-background
                        pl-11
                        pr-10
                        text-base
                        shadow-sm

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2

                        md:h-9
                        md:pl-10
                        md:text-sm
                      "
                    />
                  ) : (
                    <Input
                      id="appointment-search"
                      type="text"
                      value={
                        searchValue
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearchValue(
                          event.target
                            .value,
                        )
                      }
                      placeholder={
                        searchPlaceholder
                      }
                      aria-label="Search appointments"
                      autoComplete="off"
                      className="
                        h-11
                        w-full
                        rounded-md
                        border-input
                        bg-background
                        pl-11
                        pr-10
                        text-base
                        shadow-sm

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2

                        md:h-9
                        md:pl-10
                        md:text-sm
                      "
                    />
                  )}

                  {searchValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSearchValue(
                          '',
                        )
                      }
                      aria-label="Clear search"
                      className="
                        absolute
                        right-1.5
                        top-1/2
                        h-8
                        w-8
                        -translate-y-1/2
                        rounded-md
                        text-muted-foreground
                        hover:bg-muted
                        hover:text-foreground
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                      "
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* ====================================================
                  SEARCH CATEGORY
              ==================================================== */}

              <div className="min-w-0">
                <label
                  htmlFor="appointment-search-category"
                  className="
                    mb-2
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  <Filter className="h-3.5 w-3.5" />

                  Search by
                </label>

                <Select
                  value={
                    searchCategory
                  }
                  onValueChange={
                    handleSearchCategoryChange
                  }
                >
                  <SelectTrigger
                    id="appointment-search-category"
                    className="
                      h-11
                      w-full
                      rounded-md
                      bg-background

                      md:h-9
                    "
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {(
                      Object.keys(
                        SEARCH_CATEGORY_LABELS,
                      ) as AppointmentSearchCategory[]
                    ).map(
                      (
                        category,
                      ) => (
                        <SelectItem
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            SEARCH_CATEGORY_LABELS[
                              category
                            ]
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ======================================================
                SEARCH HELP
            ======================================================= */}

            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                border
                border-border
                bg-muted/20
                px-3
                py-2.5
              "
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <p className="text-xs leading-5 text-muted-foreground">
                {
                  SEARCH_CATEGORY_DESCRIPTIONS[
                    searchCategory
                  ]
                }
              </p>
            </div>

            {/* ======================================================
                STATUS SHORTCUTS
            ======================================================= */}

            {searchCategory ===
              'STATUS' && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Appointment status
                  </p>

                  {searchValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSearchValue(
                          '',
                        )
                      }
                      className="
                        h-8
                        rounded-md
                        px-2.5
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Button
                    type="button"
                    variant={
                      searchValue
                        ? 'outline'
                        : 'default'
                    }
                    onClick={() =>
                      setSearchValue(
                        '',
                      )
                    }
                    className="
                      h-10
                      shrink-0
                      rounded-md
                      px-3
                      text-xs
                      md:h-9
                    "
                  >
                    All
                  </Button>

                  {APPOINTMENT_STATUSES.map(
                    (
                      status,
                    ) => {
                      const active =
                        searchValue ===
                        status;

                      return (
                        <Button
                          key={
                            status
                          }
                          type="button"
                          variant={
                            active
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            setSearchValue(
                              status,
                            )
                          }
                          className="
                            h-10
                            shrink-0
                            rounded-md
                            px-3
                            text-xs
                            md:h-9
                          "
                        >
                          {status.replace(
                            /_/g,
                            ' ',
                          )}
                        </Button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* ======================================================
                ACTIVE SEARCH SUMMARY
            ======================================================= */}

            {hasSearch && (
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  rounded-lg
                  border
                  border-primary/20
                  bg-primary/5
                  p-3

                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      bg-primary
                      text-primary-foreground
                    "
                  >
                    <Search className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                      Active search
                    </p>

                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                      {
                        SEARCH_CATEGORY_LABELS[
                          searchCategory
                        ]
                      }{' '}
                      ·{' '}
                      {searchCategory ===
                      'STATUS'
                        ? searchValue.replace(
                            /_/g,
                            ' ',
                          )
                        : searchValue}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {searchResultCount}{' '}
                    result
                    {searchResultCount ===
                    1
                      ? ''
                      : 's'}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={
                      clearSearch
                    }
                    className="
                      h-8
                      rounded-md
                      px-2.5
                      text-xs
                      text-muted-foreground
                      hover:text-foreground
                    "
                  >
                    <X className="mr-1 h-3.5 w-3.5" />

                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ========================================================
            SEARCH RESULTS
           
            IMPORTANT:
            Search results now use the EXISTING AppointmentCard
            component rather than a separate custom result card.
        ========================================================= */}

        {hasSearch && (
          <section className="space-y-3">
            {/* ----------------------------------------------------
                RESULTS HEADER
            ----------------------------------------------------- */}

            <div
              className="
                flex
                flex-col
                gap-2

                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />

                  <h2
                    className="
                      text-sm
                      font-semibold
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Search Results
                  </h2>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {searchResultCount ===
                  0
                    ? 'No appointments match your search.'
                    : `Found ${searchResultCount} matching appointment${
                        searchResultCount ===
                        1
                          ? ''
                          : 's'
                      }.`}
                </p>
              </div>

              {searchResultCount >
                0 && (
                <Badge
                  variant="secondary"
                  className="
                    w-fit
                    rounded-full
                    px-2.5
                    py-1
                    text-[10px]
                    font-semibold
                  "
                >
                  {searchResultCount}{' '}
                  found
                </Badge>
              )}
            </div>

            {/* ----------------------------------------------------
                RESULT LIST

                EXISTING AppointmentCard is used directly.
            ----------------------------------------------------- */}

            {hasSearchResults ? (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-3

                  xl:grid-cols-2
                "
              >
                {filteredAppointments.map(
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
                        pendingRescheduleMap[appointment.id] ?? 0
                      }
                      className="
                        w-full
                        shadow-sm
                        hover:shadow-md
                      "
                    >
                      {/* ==========================================
                          SEARCH RESULT ACTION

                          This is rendered inside the existing
                          AppointmentCard expandable area.
                      =========================================== */}

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          handleViewSearchResult(
                            appointment,
                          )
                        }
                        className="
                          h-10
                          w-full
                          rounded-md
                          px-3
                          text-xs
                          font-medium

                          sm:w-auto

                          md:h-9
                        "
                      >
                        <CalendarDays className="mr-2 h-3.5 w-3.5" />

                        View in Schedule
                      </Button>
                    </AppointmentCard>
                  ),
                )}
              </div>
            ) : (
              /* --------------------------------------------------
                 NO RESULTS
              --------------------------------------------------- */

              <Card
                className="
                  rounded-xl
                  border-border
                  bg-card
                  shadow-sm
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    items-center
                    justify-center
                    px-6
                    py-12
                    text-center

                    md:py-16
                  "
                >
                  <div
                    className="
                      mb-4
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-full
                      bg-muted
                    "
                  >
                    <Search className="h-6 w-6 text-muted-foreground/60" />
                  </div>

                  <h3 className="text-sm font-semibold text-foreground">
                    No matching appointments
                  </h3>

                  <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    Nothing matched{' '}
                    <span className="font-medium text-foreground">
                      &quot;
                      {searchCategory ===
                      'STATUS'
                        ? searchValue.replace(
                            /_/g,
                            ' ',
                          )
                        : searchValue}
                      &quot;
                    </span>{' '}
                    using{' '}
                    <span className="font-medium text-foreground">
                      {
                        SEARCH_CATEGORY_LABELS[
                          searchCategory
                        ]
                      }
                    </span>
                    .
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      clearSearch
                    }
                    className="
                      mt-5
                      h-11
                      rounded-md
                      px-4
                      text-sm
                      font-medium

                      md:h-9
                    "
                  >
                    <X className="mr-2 h-4 w-4" />

                    Clear search
                  </Button>
                </div>
              </Card>
            )}
          </section>
        )}

        {/* ========================================================
            MAIN SCHEDULER WORKSPACE
        ========================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-4

            md:grid-cols-2
            md:gap-5

            lg:[grid-template-columns:minmax(18rem,22rem)_minmax(0,1fr)]
            lg:items-start
            lg:gap-6
          "
        >
          {/* ======================================================
              LEFT RAIL
          ======================================================= */}

          <aside className="space-y-4 md:space-y-5">
            {/* ----------------------------------------------------
                CALENDAR

                Always use the full appointment list so the calendar
                retains its normal appointment counts.
            ----------------------------------------------------- */}

            <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
              <AppointmentCalendar
                currentMonth={
                  currentMonth
                }
                onMonthChange={(
                  direction: number,
                ) =>
                  setCurrentMonth(
                    addMonths(
                      currentMonth,
                      direction,
                    ),
                  )
                }
                appointments={
                  appointments
                }
                selectedDate={
                  selectedDate
                }
                onDateClick={
                  setSelectedDate
                }
                onConfigureDate={
                  canConfigure
                    ? () =>
                        setDateConfigOpen(
                          true,
                        )
                    : undefined
                }
                closedDates={
                  closedDates
                }
                pendingRescheduleMap={
                  pendingRescheduleMap
                }
              />
            </Card>

            {/* ----------------------------------------------------
                CLOSED DATE NOTICE
            ----------------------------------------------------- */}

            {isSelectedDateClosed && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-destructive/25
                  bg-destructive/10
                  p-3.5
                  text-destructive

                  md:p-4
                "
              >
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    This date is closed
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-destructive/80">
                    No new appointments
                    can be booked on this
                    date.
                    {effective?.reason
                      ? ` Reason: ${effective.reason}`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------
                BOOKING FORM

                Existing booking form remains unchanged.
            ----------------------------------------------------- */}

            <BookingFormCard
              customers={
                customers
              }
              services={
                services
              }
              selectedDate={
                selectedDate
              }
              onSuccess={
                loadAppointments
              }
            />
          </aside>

          {/* ======================================================
              PRIMARY DAILY AGENDA
          ======================================================= */}

          <section className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div
              className="
                h-[calc(100vh-12rem)]
                min-h-[40rem]
                max-h-[64rem]

                lg:h-[calc(100vh-9.5rem)]
              "
            >
              <DailyAgenda
                /*
                 * Search results filter the agenda while searching.
                 * Normal scheduler shows the full collection.
                 */
                appointments={
                  hasSearch
                    ? filteredAppointments
                    : appointments
                }
                selectedDate={
                  selectedDate
                }
                onConfirm={
                  handleConfirm
                }
                onDecline={
                  handleDecline
                }
                onRefresh={
                  loadAppointments
                }
                pendingRescheduleMap={
                  pendingRescheduleMap
                }
              />
            </div>
          </section>
        </div>
      </div>

      {/* ==========================================================
          GLOBAL CONFIGURATION

          UNCHANGED.
      =========================================================== */}

      <GlobalConfigModal
        open={
          globalConfigOpen
        }
        onOpenChange={
          setGlobalConfigOpen
        }
      />

      {/* ==========================================================
          DATE CONFIGURATION

          UNCHANGED.
      =========================================================== */}

      <DateConfigModal
        open={
          dateConfigOpen
        }
        onOpenChange={
          setDateConfigOpen
        }
        date={
          selectedDate
        }
      />
    </PageContainer>
  );
}
