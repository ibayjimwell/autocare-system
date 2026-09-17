'use client';

import React, {
  useRef,
} from 'react';

import {
  Button,
} from '@/components/ui/button';

import {
  Input,
} from '@/components/ui/input';

import PageContainer from '@/components/shared/page-container';

import ServiceTrackingSkeleton from '@/components/skeleton/service-tracking-skeleton';

import ServiceDetailPanel from '@/components/service-tracking/service-detail-panel';

import QueueList from '@/components/queue/QueueList';

import AppointmentGrid from '@/components/service-tracking/AppointmentGrid';

import {
  useAppointmentList,
} from '@/hooks/service-tracking/useAppointmentList';

import {
  useServiceQueue,
} from '@/hooks/queue/useServiceQueue';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

import {
  toast,
} from 'sonner';

import {
  cn,
} from '@/lib/utils';

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListFilter,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  SORT_OPTIONS,
  SortField,
} from '@/app-utils/service-tracking/constants';

import ConfirmationDialog from '@/components/shared/confimation-dialog';

import FutureAppointmentsDrawer from '@/components/service-tracking/FutureAppointmentsDrawer';

import {
  format,
} from 'date-fns';

/* ================================================================
   FILTERS
================================================================ */

const FILTERS = [
  {
    value: 'CONFIRMED',
    label: 'Confirmed',
    description: 'Today’s service queue',
    icon: CheckCircle2,
  },

  {
    value: 'UNDER_INSPECTION',
    label: 'Under Inspection',
    description: 'Vehicles being inspected',
    icon: SlidersHorizontal,
  },

  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    description: 'Active repair jobs',
    icon: Clock3,
  },
];

/* ================================================================
   SERVICE TRACKING PAGE
================================================================ */

export default function ServiceTrackingPage() {
  /* ==============================================================
     APPOINTMENT LIST
  ============================================================== */

  const {
    initialLoading:
      listLoading,

    selectedAppointment,

    activeFilter,
    setActiveFilter,

    search,
    setSearch,

    sortField,
    setSortField,

    sortDirection,
    setSortDirection,

    confirmDialogOpen,
    setConfirmDialogOpen,

    pendingAppointment,

    handleInspect,
    handleConfirmStartInspection,

    handleBack,

    filteredAppointments,

    loadAppointments,

    futureAppointments,
    loadFutureAppointments,

    futureDrawerOpen,
    setFutureDrawerOpen,

    todayDate,
  } =
    useAppointmentList();

  /* ==============================================================
     TODAY / QUEUE MODE
  ============================================================== */

  const isToday =
    activeFilter ===
    'CONFIRMED';

  /* ==============================================================
     SERVICE QUEUE
     
     Queue ordering is controlled completely by the API.
     
     Priority:
       1. Earliest appointment time
       2. Earliest createdAt when appointment time is identical
     
     No manual queue movement is performed here.
  ============================================================== */

  const {
    queue,
    loading:
      queueLoading,
    loadQueue,
  } =
    useServiceQueue(
      todayDate,
      isToday,
    );

  /* ==============================================================
     FILTER TAB SCROLLER
     
     This ref is used to make the filter bar reliably horizontal
     on both touch devices and desktop mouse/trackpad devices.
     
     On desktop, a normal vertical mouse wheel over the tabs is
     converted into horizontal scrolling when the tab row actually
     overflows.
  ============================================================== */

  const filterTabsRef =
    useRef<
      HTMLDivElement
    >(null);

  const handleFilterTabsWheel =
    (
      event:
        React.WheelEvent<HTMLDivElement>,
    ) => {
      const element =
        filterTabsRef.current;

      if (
        !element
      ) {
        return;
      }

      const hasHorizontalOverflow =
        element.scrollWidth >
        element.clientWidth;

      if (
        !hasHorizontalOverflow
      ) {
        return;
      }

      /*
       * Vertical mouse-wheel movement is mapped to horizontal
       * movement so the tabs remain usable on desktop without
       * requiring the user to hold Shift.
       */
      if (
        Math.abs(
          event.deltaY,
        ) >
        Math.abs(
          event.deltaX,
        )
      ) {
        element.scrollLeft +=
          event.deltaY;

        event.preventDefault();
      }
    };

  /* ==============================================================
     START INSPECTION FROM QUEUE
     
     CONFIRMED
        ↓
     UNDER_INSPECTION
     
     Because the queue only contains CONFIRMED appointments, the
     inspected appointment automatically leaves the queue.
  ============================================================== */

  const handleStartInspectionFromQueue =
    async (
      appointmentId: string,
    ) => {
      try {
        const res =
          await appointmentsApi.updateStatus(
            appointmentId,
            'UNDER_INSPECTION',
          );

        if (
          res.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to start inspection.',
          );

          return;
        }

        toast.success(
          'Inspection started!',
        );

        /*
         * Refresh appointment lists.
         */
        await loadAppointments();

        /*
         * Refresh queue immediately.
         *
         * The appointment is now UNDER_INSPECTION, so it is excluded
         * from the CONFIRMED queue and the remaining appointments are
         * automatically renumbered by the API.
         */
        await loadQueue();
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Error starting inspection.',
        );
      }
    };

  /* ==============================================================
     INITIAL LOADING
  ============================================================== */

  if (
    listLoading
  ) {
    return (
      <PageContainer
        title="Service Tracking"
        subtitle="Monitor and manage real-time workshop operations"
      >
        <ServiceTrackingSkeleton />
      </PageContainer>
    );
  }

  /* ==============================================================
     DETAIL PANEL
  ============================================================== */

  if (
    selectedAppointment
  ) {
    return (
      <ServiceDetailPanel
        appointment={
          selectedAppointment
        }
        onBack={
          handleBack
        }
        onStatusChanged={
          loadAppointments
        }
      />
    );
  }

  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <PageContainer
      title="Service Tracking"
      subtitle="Monitor and manage real-time workshop operations"
    >
      <div className="w-full space-y-5 md:space-y-6">
        {/* ========================================================
            TOP CONTROL SURFACE
        ========================================================= */}

        <section
          className="
            w-full
            min-w-0
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-card
            shadow-sm
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-col
              gap-4
              p-4

              sm:p-5

              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            {/* ====================================================
                FILTER TABS
            ===================================================== */}

            <div
              className="
                min-w-0
                flex-1
              "
            >
              {/* --------------------------------------------------
                  HORIZONTAL SCROLL VIEWPORT
              --------------------------------------------------- */}

              <div
                ref={
                  filterTabsRef
                }
                onWheel={
                  handleFilterTabsWheel
                }
                role="tablist"
                aria-label="Service tracking filters"
                className="
                  block
                  w-full
                  max-w-full
                  min-w-0
                  overflow-x-auto
                  overflow-y-hidden
                  overscroll-x-contain
                  rounded-lg
                  border
                  border-border
                  bg-muted
                  p-1

                  scrollbar-none
                  [-webkit-overflow-scrolling:touch]
                "
              >
                {/* ------------------------------------------------
                    CONTENT WIDTH
                ------------------------------------------------- */}

                <div
                  className="
                    flex
                    w-max
                    min-w-full
                    shrink-0
                    items-stretch
                    gap-0.5
                  "
                >
                  {FILTERS.map(
                    (
                      filter,
                    ) => {
                      const Icon =
                        filter.icon;

                      const active =
                        activeFilter ===
                        filter.value;

                      return (
                        <button
                          key={
                            filter.value
                          }
                          type="button"
                          role="tab"
                          aria-selected={
                            active
                          }
                          aria-controls={`service-tracking-${filter.value.toLowerCase()}`}
                          onClick={() =>
                            setActiveFilter(
                              filter.value,
                            )
                          }
                          className={cn(
                            `
                              flex
                              min-h-11
                              shrink-0
                              items-center
                              gap-2
                              rounded-md
                              px-3.5
                              py-2
                              text-left
                              transition-colors

                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2

                              md:min-h-9
                              md:px-3
                            `,

                            active
                              ? `
                                bg-card
                                text-foreground
                                shadow-sm
                                ring-1
                                ring-border
                              `
                              : `
                                text-muted-foreground
                                hover:bg-background/70
                                hover:text-foreground
                              `,
                          )}
                        >
                          {/* ========================================
                              ICON
                          ========================================= */}

                          <span
                            className={cn(
                              `
                                flex
                                h-7
                                w-7
                                shrink-0
                                items-center
                                justify-center
                                rounded-md
                              `,

                              active
                                ? `
                                  bg-primary/10
                                  text-primary
                                `
                                : `
                                  bg-background
                                  text-muted-foreground
                                `,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          {/* ========================================
                              LABEL
                          ========================================= */}

                          <span className="min-w-0">
                            <span
                              className={cn(
                                `
                                  block
                                  truncate
                                  text-sm
                                  font-semibold
                                `,

                                active
                                  ? 'text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {
                                filter.label
                              }
                            </span>

                            <span
                              className="
                                hidden
                                whitespace-nowrap
                                text-[11px]
                                text-muted-foreground

                                lg:block
                              "
                            >
                              {
                                filter.description
                              }
                            </span>
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* --------------------------------------------------
                  SCROLL HINT
              --------------------------------------------------- */}

              <p
                className="
                  mt-1.5
                  text-[10px]
                  text-muted-foreground

                  lg:hidden
                "
              >
                Swipe horizontally to view all service states.
              </p>
            </div>

            {/* ====================================================
                RIGHT CONTROLS
            ===================================================== */}

            <div
              className="
                flex
                w-full
                min-w-0
                flex-col
                gap-2

                sm:flex-row

                lg:w-auto
              "
            >
              {/* ==================================================
                  FUTURE APPOINTMENTS
              =================================================== */}

              {isToday && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    loadFutureAppointments();

                    setFutureDrawerOpen(
                      true,
                    );
                  }}
                  className="
                    h-11
                    w-full
                    shrink-0
                    rounded-md
                    px-4
                    border-primary/30
                    text-primary
                    hover:bg-primary/5

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2

                    sm:w-auto
                    md:h-9
                  "
                >
                  <CalendarDays className="mr-2 h-4 w-4" />

                  Future Appointments
                </Button>
              )}

              {/* ==================================================
                  NON-TODAY SEARCH / SORT
              =================================================== */}

              {!isToday && (
                <>
                  {/* ----------------------------------------------
                      SEARCH
                  ----------------------------------------------- */}

                  <div
                    className="
                      relative
                      w-full

                      sm:w-[260px]
                      sm:min-w-[260px]
                    "
                  >
                    <Search
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-muted-foreground
                      "
                    />

                    <Input
                      value={
                        search
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Search customer, vehicle, tracking..."
                      className="
                        h-11
                        w-full
                        rounded-md
                        pl-10
                        pr-3
                        text-base

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2

                        md:h-9
                        md:text-sm
                      "
                    />
                  </div>

                  {/* ----------------------------------------------
                      SORT
                  ----------------------------------------------- */}

                  <div
                    className="
                      flex
                      w-full
                      min-w-0
                      gap-2

                      sm:w-auto
                    "
                  >
                    <Select
                      value={
                        sortField
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setSortField(
                          value as SortField,
                        )
                      }
                    >
                      <SelectTrigger
                        className="
                          h-11
                          min-w-0
                          flex-1
                          rounded-md
                          text-base

                          md:h-9
                          md:w-[165px]
                          md:flex-none
                          md:text-sm

                          focus:ring-2
                          focus:ring-ring
                          focus:ring-offset-2
                        "
                      >
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-4 w-4 text-muted-foreground" />

                          <SelectValue placeholder="Sort by" />
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-lg">
                        {SORT_OPTIONS.map(
                          (
                            option,
                          ) => (
                            <SelectItem
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Sort ${
                        sortDirection ===
                        'asc'
                          ? 'descending'
                          : 'ascending'
                      }`}
                      onClick={() =>
                        setSortDirection(
                          sortDirection ===
                            'asc'
                            ? 'desc'
                            : 'asc',
                        )
                      }
                      className="
                        h-11
                        w-11
                        shrink-0
                        rounded-md

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2

                        md:h-9
                        md:w-9
                      "
                    >
                      {sortDirection ===
                      'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            TODAY CONTEXT
        ========================================================= */}

        {isToday && (
          <section
            className="
              grid
              gap-3

              sm:grid-cols-[1fr_auto]
            "
          >
            {/* ----------------------------------------------------
                SERVICE DATE
            ----------------------------------------------------- */}

            <div
              className="
                rounded-xl
                border
                border-border
                bg-card
                px-4
                py-3
                shadow-sm
              "
            >
              <div className="flex items-center gap-3">
                <span
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    bg-primary/10
                    text-primary
                  "
                >
                  <CalendarDays className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p
                    className="
                      text-[11px]
                      font-medium
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Service Date
                  </p>

                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-foreground
                    "
                  >
                    {format(
                      new Date(
                        `${todayDate}T00:00:00Z`,
                      ),
                      'MMMM d, yyyy',
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                QUEUE MODE
            ----------------------------------------------------- */}

            <div
              className="
                hidden
                rounded-xl
                border
                border-border
                bg-card
                px-4
                py-3
                shadow-sm

                sm:block
              "
            >
              <div className="flex items-center gap-3">
                <span
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                    bg-muted
                    text-muted-foreground
                  "
                >
                  <Clock3 className="h-4 w-4" />
                </span>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-medium
                      uppercase
                      tracking-wider
                      text-muted-foreground
                    "
                  >
                    Queue Mode
                  </p>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-foreground
                    "
                  >
                    Appointment time priority
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            PRIMARY WORKSPACE
        ========================================================= */}

        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-card
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-border
              px-4
              py-4

              sm:px-5
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  bg-primary/10
                  text-primary
                "
              >
                <SlidersHorizontal className="h-4 w-4" />
              </span>

              <div className="min-w-0">
                <h2
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  {isToday
                    ? 'Workshop Queue'
                    : activeFilter ===
                        'UNDER_INSPECTION'
                      ? 'Inspection Jobs'
                      : 'Active Repair Jobs'}
                </h2>

                <p
                  className="
                    text-xs
                    text-muted-foreground
                  "
                >
                  {isToday
                    ? 'Earliest appointment time goes first; matching times use booking time. Inspecting a vehicle removes it from the queue.'
                    : 'Review and manage current service operations'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {isToday ? (
              <QueueList
                queue={
                  queue
                }
                loading={
                  queueLoading
                }
                onStartInspection={
                  handleStartInspectionFromQueue
                }
              />
            ) : (
              <AppointmentGrid
                appointments={
                  filteredAppointments
                }
                search={
                  search
                }
                activeFilter={
                  activeFilter
                }
                handleInspect={
                  handleInspect
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* ==========================================================
          START INSPECTION CONFIRMATION
      =========================================================== */}

      <ConfirmationDialog
        open={
          confirmDialogOpen
        }
        onOpenChange={
          setConfirmDialogOpen
        }
        title="Start Inspection"
        description={`Begin inspection for ${
          pendingAppointment?.vehicle?.make ||
          'Unknown'
        } ${
          pendingAppointment?.vehicle?.model ||
          ''
        } (${
          pendingAppointment?.vehicle
            ?.plateNumber ||
          'N/A'
        })?`}
        onConfirm={
          handleConfirmStartInspection
        }
        confirmText="Confirm & Start"
      />

      {/* ==========================================================
          FUTURE APPOINTMENTS
      =========================================================== */}

      <FutureAppointmentsDrawer
        open={
          futureDrawerOpen
        }
        onOpenChange={
          setFutureDrawerOpen
        }
        appointments={
          futureAppointments
        }
        onInspect={
          handleInspect
        }
      />
    </PageContainer>
  );
}