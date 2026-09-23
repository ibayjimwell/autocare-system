'use client';

import React, {
  useState,
} from 'react';

import {
  Button,
} from '@/components/ui/button';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Play,
  ListOrdered,
  Sparkles,
  BellRing,
  CheckCircle2,
  SearchCheck,
  Clock3,
  Wrench,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

import AppointmentCard from '@/components/appointments/appointment-card';

import ConfirmationDialog from '@/components/shared/confimation-dialog';

/* ================================================================
   PROPS
================================================================ */

type QueueListMode =
  | 'CONFIRMED'
  | 'IN_PROGRESS';

interface QueueListProps {
  queue: any[];

  loading: boolean;

  mode?: QueueListMode;

  onStartInspection: (
    appointmentId: string,
  ) => void | Promise<void>;

  onAskArriving: (
    appointmentId: string,
  ) => void | Promise<void>;

  onMarkArrived: (
    appointmentId: string,
  ) => void | Promise<void>;

  onWorkThis?: (
    appointmentId: string,
    item?: any,
  ) => void | Promise<void>;

  onContinue?: (
    item: any,
  ) => void | Promise<void>;
}

/* ================================================================
   HELPERS
================================================================ */

function normalizeQueueStatus(
  value: unknown,
): string {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function getQueueStatusLabel(
  status: string,
): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';

    case 'WORKING':
      return 'Working';

    case 'ARRIVING':
      return 'Arriving';

    case 'ARRIVED':
      return 'Arrived';

    case 'NOT_ARRIVED':
      return 'Not Arrived';

    default:
      return status || 'Pending';
  }
}

function getQueueStatusIcon(
  status: string,
) {
  switch (status) {
    case 'WORKING':
      return Wrench;

    case 'ARRIVED':
      return CheckCircle2;

    case 'ARRIVING':
      return BellRing;

    case 'NOT_ARRIVED':
      return Clock3;

    default:
      return Clock3;
  }
}

function getQueueStatusClass(
  status: string,
): string {
  switch (status) {
    case 'WORKING':
      return [
        'border-primary/25',
        'bg-primary/10',
        'text-primary',
      ].join(' ');

    case 'ARRIVED':
      return [
        'border-green-200',
        'bg-green-50',
        'text-green-700',
      ].join(' ');

    case 'ARRIVING':
      return [
        'border-blue-200',
        'bg-blue-50',
        'text-blue-700',
      ].join(' ');

    case 'NOT_ARRIVED':
      return [
        'border-amber-200',
        'bg-amber-50',
        'text-amber-700',
      ].join(' ');

    default:
      return [
        'border-border',
        'bg-muted/40',
        'text-muted-foreground',
      ].join(' ');
  }
}

function getCustomerName(
  item: any,
): string {
  const customer =
    item?.customer;

  const direct =
    customer?.fullname ??
    customer?.fullName ??
    customer?.name ??
    item?.customerName;

  if (direct) {
    return String(
      direct,
    ).trim();
  }

  const firstName =
    customer?.firstName ??
    customer?.first_name ??
    '';

  const lastName =
    customer?.lastName ??
    customer?.last_name ??
    customer?.surname ??
    '';

  const combined =
    `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

  return (
    combined ||
    'Customer'
  );
}

function getVehicleText(
  item: any,
): string {
  const vehicle =
    item?.vehicle;

  const make =
    vehicle?.make ??
    item?.vehicleMake ??
    '';

  const model =
    vehicle?.model ??
    item?.vehicleModel ??
    '';

  const year =
    vehicle?.year ??
    item?.vehicleYear ??
    '';

  const plate =
    vehicle?.plateNumber ??
    item?.plateNumber ??
    vehicle?.plate ??
    '';

  const vehicleName =
    [
      make,
      model,
      year,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  if (
    vehicleName &&
    plate
  ) {
    return `${vehicleName} • ${plate}`;
  }

  return (
    vehicleName ||
    plate ||
    'Vehicle information unavailable'
  );
}

/* ================================================================
   VEHICLE DISPLAY HELPERS
================================================================ */

/*
 * These helpers only split the already-existing vehicle information
 * into presentation fields. They do not change queue behavior or
 * appointment logic.
 */

function getVehicleMakeModel(
  item: any,
): string {
  const vehicle =
    item?.vehicle;

  const make =
    vehicle?.make ??
    item?.vehicleMake ??
    '';

  const model =
    vehicle?.model ??
    item?.vehicleModel ??
    '';

  const year =
    vehicle?.year ??
    item?.vehicleYear ??
    '';

  const vehicleName =
    [
      make,
      model,
      year,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  if (vehicleName) {
    return vehicleName;
  }

  /*
   * Keep the existing helper available as a fallback for unusual
   * API response shapes.
   */
  return getVehicleText(
    item,
  );
}

function getVehiclePlate(
  item: any,
): string {
  const vehicle =
    item?.vehicle;

  const plate =
    vehicle?.plateNumber ??
    item?.plateNumber ??
    vehicle?.plate ??
    '';

  return String(
    plate ?? '',
  ).trim();
}

/* ================================================================
   QUEUE LIST
================================================================ */

export default function QueueList({
  queue,
  loading,
  mode = 'CONFIRMED',
  onStartInspection,
  onAskArriving,
  onMarkArrived,
  onWorkThis,
  onContinue,
}: QueueListProps) {
  const isInProgressMode =
    mode === 'IN_PROGRESS';
  /* ==============================================================
     ARRIVED CONFIRMATION
  ============================================================== */

  const [
    arrivedDialogOpen,
    setArrivedDialogOpen,
  ] = useState(false);

  const [
    pendingArrivedItem,
    setPendingArrivedItem,
  ] = useState<any | null>(
    null,
  );

  const [
    arrivedActionLoading,
    setArrivedActionLoading,
  ] = useState(false);

  /* ==============================================================
     OPEN ARRIVED CONFIRMATION
  ============================================================== */

  const requestMarkArrived =
    (item: any) => {
      setPendingArrivedItem(
        item,
      );

      setArrivedDialogOpen(
        true,
      );
    };

  /* ==============================================================
     CONFIRM ARRIVED
  ============================================================== */

  const confirmMarkArrived =
    async () => {
      if (
        !pendingArrivedItem ||
        arrivedActionLoading
      ) {
        return;
      }

      const appointmentId =
        pendingArrivedItem.appointmentId ??
        pendingArrivedItem.id;

      if (!appointmentId) {
        return;
      }

      setArrivedActionLoading(
        true,
      );

      try {
        await onMarkArrived(
          appointmentId,
        );

        setArrivedDialogOpen(
          false,
        );

        setPendingArrivedItem(
          null,
        );
      } finally {
        setArrivedActionLoading(
          false,
        );
      }
    };

  /* ==============================================================
     CLOSE ARRIVED CONFIRMATION
  ============================================================== */

  const handleArrivedDialogChange =
    (
      open: boolean,
    ) => {
      if (
        arrivedActionLoading
      ) {
        return;
      }

      setArrivedDialogOpen(
        open,
      );

      if (!open) {
        setPendingArrivedItem(
          null,
        );
      }
    };

  /* ==============================================================
     LOADING
  ============================================================== */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[180px]
          items-center
          justify-center
          rounded-xl
          border
          border-border
          bg-background
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-3
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-primary/10
            "
          >
            <ListOrdered
              className="
                h-5
                w-5
                animate-pulse
                text-primary
              "
            />
          </div>

          <p
            className="
              text-sm
              font-medium
              text-muted-foreground
            "
          >
            Loading workshop queue...
          </p>
        </div>
      </div>
    );
  }

  /* ==============================================================
     EMPTY
  ============================================================== */

  if (
    queue.length ===
    0
  ) {
    return (
      <div
        className="
          flex
          min-h-[180px]
          flex-col
          items-center
          justify-center
          rounded-xl
          border
          border-dashed
          border-border
          bg-background
          px-6
          text-center
        "
      >
        <div
          className="
            mb-3
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-muted
          "
        >
          <Play
            className="
              h-5
              w-5
              text-muted-foreground
            "
          />
        </div>

        <p
          className="
            text-sm
            font-semibold
            text-foreground
          "
        >
          {isInProgressMode
            ? 'No in-progress appointments'
            : 'No confirmed appointments'}
        </p>

        <p
          className="
            mt-1
            max-w-md
            text-xs
            leading-5
            text-muted-foreground
          "
        >
          {isInProgressMode
            ? 'There are no IN_PROGRESS repair appointments waiting in the work queue.'
            : 'There are no confirmed appointments waiting in today&apos;s service queue.'}
        </p>
      </div>
    );
  }

  /* ==============================================================
     QUEUE
  ============================================================== */

  return (
    <>
      <div className="space-y-4">
        {queue.map(
          (
            item,
            index,
          ) => {
            /* ====================================================
               QUEUE NUMBER
            ===================================================== */

            const queueNumber =
              item.queueNumber ??
              index + 1;

            /* ====================================================
               QUEUE STATUS
            ===================================================== */

            const queueStatus =
              normalizeQueueStatus(
                item.queueStatus,
              );

            const statusLabel =
              getQueueStatusLabel(
                queueStatus,
              );

            const StatusIcon =
              getQueueStatusIcon(
                queueStatus,
              );

            /* ====================================================
               PRIORITY
            ===================================================== */

            const isFirst =
              index === 0;

            const isSecond =
              index === 1;

            const isWorking =
              queueStatus ===
              'WORKING';

            const canWorkThis =
              isInProgressMode &&
              !isWorking &&
              (isFirst ||
                isSecond);

            /* ====================================================
               ARRIVED STATE
            ===================================================== */

            const isArrived =
              queueStatus ===
              'ARRIVED';

            const canMarkArrived =
              [
                'PENDING',
                'ARRIVING',
                'NOT_ARRIVED',
              ].includes(
                queueStatus,
              );

            const canAskArriving =
              [
                'PENDING',
                'NOT_ARRIVED',
              ].includes(
                queueStatus,
              );

            /* ====================================================
               NORMALIZED APPOINTMENT
            ===================================================== */

            const appointment =
              {
                ...item,

                id:
                  item.appointmentId ||
                  item.id,

                appointmentId:
                  item.appointmentId ||
                  item.id,
              };

            /* ====================================================
               DISPLAY INFORMATION
            ===================================================== */

            const customerName =
              getCustomerName(
                item,
              );

            const vehicleMakeModel =
              getVehicleMakeModel(
                item,
              );

            const vehiclePlate =
              getVehiclePlate(
                item,
              );

            return (
              <div
                key={
                  item.queueId ||
                  item.appointmentId ||
                  item.id
                }
                className="
                  relative
                  pt-5
                "
              >
                {/* ==================================================
                    QUEUE NUMBER
                    CENTER TOP
                   
                    The queue marker now has its own reserved space
                    above AppointmentCard. It is no longer placed over
                    the appointment header/tracking number.
                =================================================== */}

                <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
                  <div
                    className={cn(
                      `
                        flex
                        min-w-[56px]
                        items-center
                        justify-center
                        gap-1.5
                        rounded-full
                        border
                        px-3
                        py-1.5
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wider
                        shadow-sm
                      `,

                      isFirst &&
                        `
                          border-primary
                          bg-primary
                          text-primary-foreground
                          shadow-md
                        `,

                      isSecond &&
                        `
                          border-primary/35
                          bg-primary/10
                          text-primary
                        `,

                      !isFirst &&
                        !isSecond &&
                        `
                          border-border
                          bg-card
                          text-muted-foreground
                        `,
                    )}
                  >
                    <ListOrdered className="h-3 w-3" />

                    <span className="tabular-nums">
                      #{queueNumber}
                    </span>
                  </div>
                </div>

                {/* ==================================================
                    APPOINTMENT CARD
                =================================================== */}

                <AppointmentCard
                  appointment={
                    appointment
                  }
                  className={cn(
                    `
                      w-full
                      overflow-hidden
                      rounded-xl
                      border
                      bg-card
                      shadow-sm
                      transition-all
                    `,

                    /*
                     * ARRIVED
                     */
                    isArrived &&
                      !isInProgressMode &&
                      `
                        border-green-500/40
                        ring-1
                        ring-green-500/15
                      `,

                    isWorking &&
                      `
                        border-primary/40
                        ring-1
                        ring-primary/15
                        shadow-md
                      `,

                    /*
                     * FIRST
                     */
                    !isArrived &&
                      isFirst &&
                      `
                        border-primary
                        ring-2
                        ring-primary/25
                        shadow-md
                        hover:shadow-lg
                      `,

                    /*
                     * SECOND
                     */
                    !isArrived &&
                      isSecond &&
                      `
                        border-primary/35
                        ring-1
                        ring-primary/15
                        shadow-sm
                        hover:shadow-md
                      `,

                    /*
                     * Remaining queue.
                     */
                    !isArrived &&
                      !isFirst &&
                      !isSecond &&
                      `
                        border-border
                        hover:shadow-md
                      `,
                  )}
                >
                  {/* =================================================
                      QUEUE / VEHICLE INFORMATION
                  ================================================== */}

                  <div
                    className="
                      border-b
                      border-border
                      bg-background/40
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-3

                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      {/* =============================================
                          VEHICLE PRIMARY INFORMATION
                      ============================================== */}

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-[1.2px]
                              text-muted-foreground
                            "
                          >
                            Vehicle
                          </span>

                          <Badge
                            variant="outline"
                            className={cn(
                              `
                                rounded-full
                                px-2
                                py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-wider
                              `,

                              getQueueStatusClass(
                                queueStatus,
                              ),
                            )}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />

                            {
                              statusLabel
                            }
                          </Badge>

                          {isFirst &&
                            !isArrived &&
                            !isWorking && (
                              <Badge
                                className="
                                  rounded-full
                                  bg-primary
                                  px-2
                                  py-0.5
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-primary-foreground
                                  hover:bg-primary
                                "
                              >
                                Priority
                              </Badge>
                          )}

                          {isSecond &&
                            !isArrived &&
                            !isWorking && (
                              <Badge
                                variant="outline"
                                className="
                                  rounded-full
                                  border-primary/25
                                  bg-primary/5
                                  px-2
                                  py-0.5
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-primary
                                "
                              >
                                Next
                              </Badge>
                          )}
                        </div>

                        {/* ===========================================
                            MAKE + MODEL + PLATE
                        ============================================ */}

                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className="
                              min-w-0
                              text-base
                              font-bold
                              tracking-tight
                              text-foreground
                              sm:text-lg
                            "
                          >
                            {
                              vehicleMakeModel
                            }
                          </span>

                          {vehiclePlate && (
                            <>
                              <span
                                className="
                                  text-xs
                                  font-medium
                                  text-muted-foreground
                                "
                                aria-hidden="true"
                              >
                                •
                              </span>

                              <span
                                className="
                                  rounded-md
                                  border
                                  border-border
                                  bg-card
                                  px-2
                                  py-1
                                  font-mono
                                  text-xs
                                  font-bold
                                  tracking-wider
                                  text-foreground
                                "
                              >
                                {
                                  vehiclePlate
                                }
                              </span>
                            </>
                          )}
                        </div>

                        {/* ===========================================
                            CUSTOMER SECONDARY INFORMATION
                        ============================================ */}

                        <p
                          className="
                            mt-1
                            truncate
                            text-xs
                            font-medium
                            text-muted-foreground
                          "
                        >
                          Customer: {
                            customerName
                          }
                        </p>

                        {/* ===========================================
                            APPOINTMENT TIME
                        ============================================ */}

                        <p
                          className="
                            mt-0.5
                            text-[11px]
                            text-muted-foreground
                          "
                        >
                          {item.appointmentTime
                            ? `Appointment ${item.appointmentTime}`
                            : 'Appointment time unavailable'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* =================================================
                      QUEUE CONTROLS
                  ================================================== */}

                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      p-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    {/* ===============================================
                        QUEUE INFORMATION
                    ============================================== */}

                    <div
                      className="
                        min-w-0
                        flex-1
                        rounded-lg
                        bg-background/60
                        px-3
                        py-2.5
                      "
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[1.2px]
                            text-muted-foreground
                          "
                        >
                          Workshop Queue
                        </span>

                        <span
                          className="
                            text-xs
                            font-semibold
                            tabular-nums
                            text-foreground
                          "
                        >
                          Position #{queueNumber}
                        </span>
                      </div>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-muted-foreground
                        "
                      >
                        {isInProgressMode
                          ? isWorking
                            ? 'Mechanic is currently working on this repair.'
                            : isFirst
                              ? 'First pending repair in UpdatedAt queue order.'
                              : isSecond
                                ? 'Second pending repair in UpdatedAt queue order.'
                                : `Position ${queueNumber} in the in-progress work queue.`
                          : isFirst
                            ? 'First appointment in scheduled queue order.'
                            : isSecond
                              ? 'Immediately after the first appointment.'
                              : `Position ${queueNumber} in today&apos;s scheduled queue.`}
                      </p>
                    </div>

                    {/* ===============================================
                        ACTIONS
                    ============================================== */}

                    <div
                      className="
                        flex
                        w-full
                        flex-col
                        gap-2

                        sm:w-auto
                        sm:min-w-[220px]
                      "
                    >
                      {isInProgressMode ? (
                        <>
                          {/* =================================================
                              WORK THIS
                              Only the first two PENDING jobs may be started.
                          ================================================== */}

                          {canWorkThis && (
                            <Button
                              type="button"
                              className="
                                h-11
                                w-full
                                rounded-md
                                bg-primary
                                px-4
                                text-sm
                                font-semibold
                                text-white
                                hover:bg-primary/90
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                                md:text-xs
                              "
                              onClick={() =>
                                onWorkThis?.(
                                  item.appointmentId ||
                                    item.id,
                                  item,
                                )
                              }
                            >
                              <Play className="mr-2 h-4 w-4" />

                              Work This
                            </Button>
                          )}

                          {/* =================================================
                              CONTINUE
                              Every WORKING appointment can continue to the
                              service detail panel.
                          ================================================== */}

                          {isWorking && (
                            <Button
                              type="button"
                              variant="outline"
                              className="
                                h-11
                                w-full
                                rounded-md
                                border-primary/30
                                bg-primary/5
                                px-4
                                text-sm
                                font-semibold
                                text-primary
                                hover:bg-primary/10
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                                md:text-xs
                              "
                              onClick={() =>
                                onContinue?.(
                                  item,
                                )
                              }
                            >
                              <Wrench className="mr-2 h-4 w-4" />

                              Continue
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* =================================================
                              ARRIVED
                          ================================================== */}

                          {canMarkArrived && (
                            <Button
                              type="button"
                              variant="outline"
                              className="
                                h-11
                                w-full
                                rounded-md
                                border-green-600/30
                                bg-green-50
                                px-4
                                text-sm
                                font-semibold
                                text-green-700
                                hover:bg-green-100
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                                md:text-xs
                              "
                              onClick={() =>
                                requestMarkArrived(
                                  item,
                                )
                              }
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />

                              Arrived
                            </Button>
                          )}

                          {/* =================================================
                              ASK ARRIVING
                          ================================================== */}

                          {canAskArriving && (
                            <Button
                              type="button"
                              variant="outline"
                              className="
                                h-11
                                w-full
                                rounded-md
                                border-primary/25
                                bg-primary/5
                                px-4
                                text-sm
                                font-semibold
                                text-primary
                                hover:bg-primary/10
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                                md:text-xs
                              "
                              onClick={() =>
                                onAskArriving(
                                  item.appointmentId ||
                                    item.id,
                                )
                              }
                            >
                              <BellRing className="mr-2 h-4 w-4" />

                              Ask Arriving
                            </Button>
                          )}

                          {/* =================================================
                              INSPECT
                          ================================================== */}

                          {isArrived && (
                            <Button
                              type="button"
                              className="
                                h-11
                                w-full
                                rounded-md
                                bg-primary
                                px-4
                                text-sm
                                font-semibold
                                text-white
                                hover:bg-primary/90
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                                md:text-xs
                              "
                              onClick={() =>
                                onStartInspection(
                                  item.appointmentId ||
                                    item.id,
                                )
                              }
                            >
                              <SearchCheck className="mr-2 h-4 w-4" />

                              Inspect
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      STATE NOTE
                  ================================================== */}

                  {isInProgressMode ? (
                    isWorking ? (
                      <div
                        className="
                          mx-3
                          mb-3
                          flex
                          items-center
                          gap-2
                          rounded-md
                          bg-primary/5
                          px-2.5
                          py-2
                          text-[10px]
                          font-medium
                          text-primary
                        "
                      >
                        <Wrench className="h-3.5 w-3.5 shrink-0" />

                        This repair is currently Working. Continue to open the service details.
                      </div>
                    ) : (
                      (isFirst ||
                        isSecond) && (
                        <div
                          className={cn(
                            `
                              mx-3
                              mb-3
                              flex
                              items-center
                              gap-2
                              rounded-md
                              px-2.5
                              py-2
                              text-[10px]
                              font-medium
                            `,
                            isFirst
                              ? `
                                  bg-primary/5
                                  text-primary
                                `
                              : `
                                  bg-primary/5
                                  text-primary/80
                                `,
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />

                          {isFirst
                            ? 'First pending repair. Work This is available.'
                            : 'Second pending repair. Work This is available.'}
                        </div>
                      )
                    )
                  ) : (
                    isArrived ? (
                      <div
                        className="
                          mx-3
                          mb-3
                          flex
                          items-center
                          gap-2
                          rounded-md
                          bg-green-500/5
                          px-2.5
                          py-2
                          text-[10px]
                          font-medium
                          text-green-700
                        "
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />

                        Vehicle has arrived and is ready for inspection.
                      </div>
                    ) : (
                      (isFirst ||
                        isSecond) && (
                        <div
                          className={cn(
                            `
                              mx-3
                              mb-3
                              flex
                              items-center
                              gap-2
                              rounded-md
                              px-2.5
                              py-2
                              text-[10px]
                              font-medium
                            `,
                            isFirst
                              ? `
                                  bg-primary/5
                                  text-primary
                                `
                              : `
                                  bg-primary/5
                                  text-primary/80
                                `,
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />

                          {isFirst
                            ? 'First appointment in scheduled queue order.'
                            : 'Immediately after the first appointment.'}
                        </div>
                      )
                    )
                  )}
                </AppointmentCard>
              </div>
            );
          },
        )}
      </div>

      {/* ============================================================
          ARRIVED CONFIRMATION
      ============================================================ */}

      {!isInProgressMode && (
        <ConfirmationDialog
          open={
            arrivedDialogOpen
          }
        onOpenChange={
          handleArrivedDialogChange
        }
        title="Confirm Vehicle Arrival"
        description={
          pendingArrivedItem
            ? `
              Are you sure the vehicle has arrived?

              Customer: ${getCustomerName(
                pendingArrivedItem,
              )}

              Vehicle: ${getVehicleMakeModel(
                pendingArrivedItem,
              )}

              Plate Number: ${
                getVehiclePlate(
                  pendingArrivedItem,
                ) ||
                'N/A'
              }

              Tracking Number: ${
                pendingArrivedItem.trackingNumber ||
                'N/A'
              }

              Queue Position: ${
                pendingArrivedItem.queueNumber ??
                'N/A'
              }

              Double-check the appointment information before confirming. This action cannot be undone, and you are responsible for this action.
            `
            : 'Are you sure the vehicle has arrived? Double-check the information before confirming. This action cannot be undone, and you are responsible for this action.'
        }
        onConfirm={
          confirmMarkArrived
        }
        confirmText={
          arrivedActionLoading
            ? 'Marking Arrived...'
            : 'Yes, Vehicle Arrived'
          }
        />
      )}
    </>
  );
}
