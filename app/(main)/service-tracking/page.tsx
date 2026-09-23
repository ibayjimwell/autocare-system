'use client';

import React, {
  useState,
} from 'react';

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
  serviceQueueApi,
} from '@/lib/queue/service-queue';

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
  Button,
} from '@/components/ui/button';

import {
  Input,
} from '@/components/ui/input';

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
    description:
      'Today’s service queue',
    icon: CheckCircle2,
  },
  {
    value:
      'UNDER_INSPECTION',
    label:
      'Under Inspection',
    description:
      'Vehicles being inspected',
    icon:
      SlidersHorizontal,
  },
  {
    value:
      'IN_PROGRESS',
    label:
      'In Progress',
    description:
      'Active repair jobs',
    icon:
      Clock3,
  },
];

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
     QUEUE-OPENED DETAIL PANEL
  ============================================================== */

  const [
    queueDetailAppointment,
    setQueueDetailAppointment,
  ] = useState<any | null>(
    null,
  );

  const normalizeQueueAppointment = (
    item: any,
    forcedStatus?: string,
  ) => {
    const appointmentId =
      item?.appointmentId ??
      item?.id;

    return {
      ...item,
      id: appointmentId,
      appointmentId,
      status:
        forcedStatus ??
        item?.status ??
        'IN_PROGRESS',
    };
  };

  /* =============================================================
     LOAD COMPLETE APPOINTMENT FOR DETAIL PANEL

     Queue rows are intentionally lightweight. They contain queue
     information, but they are not guaranteed to contain the complete
     appointment relationship data used by ServiceDetailPanel, such as
     customerId, vehicleId, and the booked service records.

     The detail panel expects those identifiers to exist because the
     official CustomerCard, VehicleCard, and ServiceCard components use
     them to load their own records.

     Therefore Work This / Continue must hydrate the selected queue row
     with the complete appointment before opening ServiceDetailPanel.
  =============================================================== */

  const loadCompleteAppointmentForDetail =
    async (
      appointmentId: string,
      queueItem?: any,
      forcedStatus: string = 'IN_PROGRESS',
    ) => {
      if (!appointmentId) {
        toast.error(
          'Unable to open service details because the appointment ID is missing.',
        );

        return null;
      }

      try {
        const response =
          await appointmentsApi.get(
            appointmentId,
          );

        if (
          response?.error ||
          !response?.data
        ) {
          toast.error(
            response?.errorMessage ||
              'Unable to load the complete appointment information.',
          );

          return null;
        }

        const fullAppointment =
          response.data;

        /*
         * Keep queue-specific fields from the queue row while allowing
         * the appointment API to provide the authoritative appointment,
         * customer, vehicle, and service relationship data.
         */
        return normalizeQueueAppointment(
          {
            ...(queueItem || {}),
            ...fullAppointment,

            id:
              fullAppointment?.id ??
              appointmentId,

            appointmentId:
              fullAppointment?.id ??
              appointmentId,

            customerId:
              fullAppointment?.customerId ??
              queueItem?.customerId,

            vehicleId:
              fullAppointment?.vehicleId ??
              queueItem?.vehicleId,

            services:
              fullAppointment?.services ??
              queueItem?.services ??
              [],

            queueStatus:
              queueItem?.queueStatus ??
              fullAppointment?.queueStatus,
          },
          forcedStatus,
        );
      } catch (
        error: any
      ) {
        console.error(
          '[ServiceTracking] Failed to load complete appointment:',
          error,
        );

        toast.error(
          error?.message ||
            'Unable to load the complete appointment information.',
        );

        return null;
      }
    };

  const handleCloseQueueDetail = () => {
    setQueueDetailAppointment(
      null,
    );
  };

  const handleDetailStatusChanged =
    async () => {
      await Promise.all([
        loadAppointments(),
        loadQueue(),
      ]);
    };

  /* ==============================================================
     TAB / QUEUE MODE
  ============================================================== */

  const isConfirmedTab =
    activeFilter ===
    'CONFIRMED';

  const queueMode:
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | null =
    activeFilter ===
    'CONFIRMED'
      ? 'CONFIRMED'
      : activeFilter ===
          'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : null;

  /* ==============================================================
     SERVICE QUEUE
  ============================================================== */

  const {
    queue,
    loading:
      queueLoading,
    loadQueue,
  } =
    useServiceQueue(
      todayDate,
      queueMode !== null,
    );

  /* ==============================================================
     STRICT TAB FILTERS
  ============================================================== */

  const confirmedAppointments =
    queue.filter(
      item =>
        String(
          item?.status ??
            '',
        ).toUpperCase() ===
        'CONFIRMED',
    );

  const underInspectionAppointments =
    filteredAppointments.filter(
      appointment =>
        String(
          appointment?.status ??
            '',
        ).toUpperCase() ===
        'UNDER_INSPECTION',
    );

  const inProgressAppointments =
    filteredAppointments.filter(
      appointment =>
        String(
          appointment?.status ??
            '',
        ).toUpperCase() ===
        'IN_PROGRESS',
    );

  /* ==============================================================
     REFRESH
  ============================================================== */

  const refreshQueueAndAppointments =
    async () => {
      await Promise.all([
        loadAppointments(),
        loadQueue(),
      ]);
    };

  /* ==============================================================
     START INSPECTION FROM CONFIRMED QUEUE
     
     ARRIVED
        ↓
     appointment UNDER_INSPECTION
        ↓
     queue INSPECTING
     
     The appointment then leaves the Confirmed tab and appears in
     Under Inspection.
  ============================================================== */

  const handleStartInspectionFromQueue =
    async (
      appointmentId: string,
    ) => {
      try {
        /*
         * ----------------------------------------------------------
         * Validate current queue state first.
         * ----------------------------------------------------------
         *
         * The UI already hides Inspect for other states, but this
         * guard prevents an accidental/stale click from starting
         * inspection before the vehicle is ARRIVED.
         */
        const currentQueueItem =
          queue.find(
            item =>
              String(
                item?.appointmentId ??
                  item?.id ??
                  '',
              ) ===
              String(
                appointmentId,
              ),
          );

        const currentQueueStatus =
          String(
            currentQueueItem
              ?.queueStatus ??
              '',
          )
            .trim()
            .toUpperCase();

        if (
          currentQueueStatus !==
          'ARRIVED'
        ) {
          toast.error(
            'The vehicle must be marked Arrived before inspection can start.',
          );

          return;
        }

        /*
         * ----------------------------------------------------------
         * STEP 1
         *
         * Appointment:
         *
         * CONFIRMED
         *     ↓
         * UNDER_INSPECTION
         * ----------------------------------------------------------
         */

        const appointmentResponse =
          await appointmentsApi.updateStatus(
            appointmentId,
            'UNDER_INSPECTION',
          );

        if (
          appointmentResponse?.error
        ) {
          toast.error(
            appointmentResponse.errorMessage ||
              'Failed to start inspection.',
          );

          return;
        }

        /*
         * ----------------------------------------------------------
         * STEP 2
         *
         * Keep the queue lifecycle synchronized:
         *
         * ARRIVED
         *     ↓
         * INSPECTING
         *
         * The status route accepts INSPECTING once the appointment
         * itself is UNDER_INSPECTION.
         * ----------------------------------------------------------
         */

        const queueResponse =
          await serviceQueueApi.updateStatus(
            appointmentId,
            'INSPECTING',
          );

        if (
          queueResponse?.error
        ) {
          /*
           * The appointment status has already changed. Do not hide
           * that successful lifecycle transition, but notify the
           * staff that the queue marker could not be synchronized.
           */
          toast.error(
            queueResponse.errorMessage ||
              'Inspection started, but the queue status could not be synchronized.',
          );
        } else {
          toast.success(
            'Inspection started!',
          );
        }

        /*
         * Refresh both data sources so the appointment leaves the
         * Confirmed queue immediately and appears in Under Inspection.
         */
        await refreshQueueAndAppointments();
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
     ASK ARRIVING
  ============================================================== */

  const handleAskArriving =
    async (
      appointmentId: string,
    ) => {
      try {
        const res =
          await serviceQueueApi.askArriving(
            appointmentId,
          );

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to ask customer.',
          );

          return;
        }

        toast.success(
          'Arriving request sent to the customer.',
        );

        await loadQueue();
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Failed to ask customer.',
        );
      }
    };

  /* ==============================================================
     MARK ARRIVED
     
     Queue:
     
       PENDING / ARRIVING / NOT_ARRIVED
                 ↓
              ARRIVED
     
     Queue API recalculates the confirmed line after this change.
  ============================================================== */

  const handleMarkArrived =
    async (
      appointmentId: string,
    ) => {
      try {
        const currentQueueItem =
          queue.find(
            item =>
              String(
                item?.appointmentId ??
                  item?.id ??
                  '',
              ) ===
              String(
                appointmentId,
              ),
          );

        const currentQueueStatus =
          String(
            currentQueueItem
              ?.queueStatus ??
              '',
          )
            .trim()
            .toUpperCase();

        if (
          ![
            'PENDING',
            'ARRIVING',
            'NOT_ARRIVED',
          ].includes(
            currentQueueStatus,
          )
        ) {
          toast.error(
            'This vehicle can no longer be marked as arrived.',
          );

          return;
        }

        const res =
          await serviceQueueApi.markArrived(
            appointmentId,
          );

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to mark customer arrived.',
          );

          return;
        }

        toast.success(
          'Vehicle marked as arrived.',
        );

        /*
         * The GET /api/queue endpoint orders ARRIVED vehicles first,
         * so reloading the queue immediately updates the queue line.
         */
        await Promise.all([
          loadQueue(),
          loadAppointments(),
        ]);
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Failed to mark customer arrived.',
        );
      }
    };

  /* ==============================================================
     WORK THIS

     IN_PROGRESS queue action:

       PENDING
          ↓
       WORKING
          ↓
       Service Detail Panel

     Only the first and second pending jobs are allowed to start
     directly from the queue. The QueueList owns that positional rule.
  ============================================================== */

  const handleWorkThis =
    async (
      appointmentId: string,
      queueItem?: any,
    ) => {
      try {
        const currentQueueItem =
          queue.find(
            item =>
              String(
                item?.appointmentId ??
                  item?.id ??
                  '',
              ) ===
              String(
                appointmentId,
              ),
          );

        const itemForDetail =
          queueItem ??
          currentQueueItem ??
          {
            id: appointmentId,
            appointmentId,
            status: 'IN_PROGRESS',
            queueStatus: 'PENDING',
          };

        const currentQueueStatus =
          String(
            itemForDetail?.queueStatus ??
              '',
          )
            .trim()
            .toUpperCase();

        if (
          currentQueueStatus &&
          currentQueueStatus !==
            'PENDING'
        ) {
          toast.error(
            'This repair is no longer pending in the work queue.',
          );

          return;
        }

        /*
         * First transition the queue row from PENDING to WORKING.
         * The service detail panel is opened only after that succeeds.
         */
        const res =
          await serviceQueueApi.startWorking(
            appointmentId,
          );

        if (
          res?.error
        ) {
          toast.error(
            res.errorMessage ||
              'Failed to start work.',
          );

          return;
        }

        /*
         * IMPORTANT:
         *
         * Do not pass the lightweight queue record directly into the
         * detail panel. Hydrate the appointment first so ServiceCard
         * receives a real service ID and CustomerCard / VehicleCard
         * receive their required identifiers.
         */
        const detailAppointment =
          await loadCompleteAppointmentForDetail(
            appointmentId,
            {
              ...itemForDetail,
              queueStatus: 'WORKING',
            },
            'IN_PROGRESS',
          );

        if (
          !detailAppointment
        ) {
          /*
           * The queue transition succeeded, but the detail record could
           * not be hydrated. Leave the queue state intact and allow the
           * normal queue refresh to display WORKING.
           */
          await Promise.all([
            loadQueue(),
            loadAppointments(),
          ]);

          return;
        }

        detailAppointment.queueStatus =
          'WORKING';

        setQueueDetailAppointment(
          detailAppointment,
        );

        toast.success(
          'Work started. Opening service details.',
        );

        await Promise.all([
          loadQueue(),
          loadAppointments(),
        ]);
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Failed to start work.',
        );
      }
    };

  /* ==============================================================
     CONTINUE WORKING JOB

     A WORKING queue entry can always continue to the same service
     detail panel without changing its queue status.
  ============================================================== */

  const handleContinueWorking =
    async (
      queueItem: any,
    ) => {
      const appointmentId =
        queueItem?.appointmentId ??
        queueItem?.id;

      if (!appointmentId) {
        toast.error(
          'Unable to open service details because the appointment ID is missing.',
        );

        return;
      }

      /*
       * A WORKING queue row can also be lightweight. Hydrate the full
       * appointment before opening the detail panel so all child cards
       * receive their required IDs.
       */
      const detailAppointment =
        await loadCompleteAppointmentForDetail(
          appointmentId,
          queueItem,
          'IN_PROGRESS',
        );

      if (
        !detailAppointment
      ) {
        return;
      }

      detailAppointment.queueStatus =
        'WORKING';

      setQueueDetailAppointment(
        detailAppointment,
      );
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

  const detailAppointment =
    queueDetailAppointment ??
    selectedAppointment;

  if (
    detailAppointment
  ) {
    return (
      <ServiceDetailPanel
        appointment={
          detailAppointment
        }
        onBack={
          queueDetailAppointment
            ? handleCloseQueueDetail
            : handleBack
        }
        onStatusChanged={
          handleDetailStatusChanged
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

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

            {/* ----------------------------------------------------
                FILTER TABS
            ----------------------------------------------------- */}

            <div className="min-w-0">
              <div
                className="
                  inline-flex
                  max-w-full
                  overflow-x-auto
                  rounded-lg
                  border
                  border-border
                  bg-muted
                  p-1
                  no-scrollbar
                "
                role="tablist"
                aria-label="Service tracking filters"
              >
                {FILTERS.map(
                  filter => {
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
                          `,
                          `
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          `,
                          `
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

                          <span className="hidden text-[11px] text-muted-foreground lg:block">
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

            {/* ----------------------------------------------------
                RIGHT CONTROLS
            ----------------------------------------------------- */}

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              {isConfirmedTab && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    loadFutureAppointments();

                    setFutureDrawerOpen(
                      true,
                    );
                  }}
                  className={cn(
                    `
                      h-11
                      w-full
                      rounded-md
                      px-4
                      sm:w-auto
                      md:h-9
                    `,
                    `
                      border-primary/30
                      text-primary
                      hover:bg-primary/5
                    `,
                    `
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      focus-visible:ring-offset-2
                    `,
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />

                  Future Appointments
                </Button>
              )}

              {!isConfirmedTab && (
                <>
                  {/* SEARCH */}

                  <div className="relative w-full sm:min-w-[260px] sm:w-[260px]">
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
                      onChange={e =>
                        setSearch(
                          e.target.value,
                        )
                      }
                      placeholder="Search customer, vehicle, tracking..."
                      className={cn(
                        `
                          h-11
                          rounded-md
                          pl-10
                          pr-3
                          text-base
                          md:h-9
                          md:text-sm
                        `,
                        `
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        `,
                      )}
                    />
                  </div>

                  {/* SORT */}

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Select
                      value={
                        sortField
                      }
                      onValueChange={val =>
                        setSortField(
                          val as SortField,
                        )
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          `
                            h-11
                            min-w-0
                            flex-1
                            rounded-md
                            text-base
                            md:h-9
                            md:w-[165px]
                            md:flex-none
                            md:text-sm
                          `,
                          `
                            focus:ring-2
                            focus:ring-ring
                            focus:ring-offset-2
                          `,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-4 w-4 text-muted-foreground" />

                          <SelectValue placeholder="Sort by" />
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-lg">
                        {SORT_OPTIONS.map(
                          opt => (
                            <SelectItem
                              key={
                                opt.value
                              }
                              value={
                                opt.value
                              }
                            >
                              {
                                opt.label
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
                      className={cn(
                        `
                          h-11
                          w-11
                          shrink-0
                          rounded-md
                          md:h-9
                          md:w-9
                        `,
                        `
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        `,
                      )}
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

        {isConfirmedTab && (
          <section className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Service Date
                  </p>

                  <p className="truncate text-sm font-semibold text-foreground">
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

            <div className="hidden rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:block">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                </span>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Queue Mode
                  </p>

                  <p className="text-sm font-semibold text-foreground">
                    Confirmed appointments
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            PRIMARY WORKSPACE
        ========================================================= */}

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </span>

              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {activeFilter ===
                  'CONFIRMED'
                    ? 'Confirmed Queue'
                    : activeFilter ===
                        'UNDER_INSPECTION'
                      ? 'Under Inspection'
                      : 'In Progress'}
                </h2>

                <p className="text-xs text-muted-foreground">
                  {activeFilter ===
                  'CONFIRMED'
                    ? 'Vehicles must be marked Arrived before the Inspect action becomes available.'
                    : activeFilter ===
                        'UNDER_INSPECTION'
                      ? 'Only appointments whose current status is UNDER_INSPECTION are shown.'
                      : 'IN_PROGRESS appointments are queued by the latest queue UpdatedAt. Work This is available for the first two pending jobs.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {activeFilter ===
            'CONFIRMED' ? (
              <QueueList
                queue={
                  confirmedAppointments
                }
                loading={
                  queueLoading
                }
                onStartInspection={
                  handleStartInspectionFromQueue
                }
                onAskArriving={
                  handleAskArriving
                }
                onMarkArrived={
                  handleMarkArrived
                }
              />
            ) : activeFilter ===
              'UNDER_INSPECTION' ? (
              <AppointmentGrid
                appointments={
                  underInspectionAppointments
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
            ) : (
              <QueueList
                mode="IN_PROGRESS"
                queue={
                  queue.filter(
                    item =>
                      String(
                        item?.status ??
                          '',
                      ).trim().toUpperCase() ===
                      'IN_PROGRESS' &&
                      (
                        String(
                          item?.queueStatus ??
                            '',
                        ).trim().toUpperCase() ===
                          'PENDING' ||
                        String(
                          item?.queueStatus ??
                            '',
                        ).trim().toUpperCase() ===
                          'WORKING'
                      )
                  )
                }
                loading={
                  queueLoading
                }
                onStartInspection={
                  handleStartInspectionFromQueue
                }
                onAskArriving={
                  handleAskArriving
                }
                onMarkArrived={
                  handleMarkArrived
                }
                onWorkThis={
                  handleWorkThis
                }
                onContinue={
                  handleContinueWorking
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* ==========================================================
          EXISTING START INSPECTION CONFIRMATION
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
