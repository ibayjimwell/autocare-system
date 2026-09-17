'use client';

import React from 'react';

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
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

import AppointmentCard from '@/components/appointments/appointment-card';

/* ================================================================
   PROPS
================================================================ */

interface QueueListProps {
  queue: any[];

  loading: boolean;

  onStartInspection: (
    appointmentId: string,
  ) => void;
}

/* ================================================================
   QUEUE LIST
================================================================ */

export default function QueueList({
  queue,
  loading,
  onStartInspection,
}: QueueListProps) {
  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {
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
          No confirmed appointments
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
          There are no confirmed appointments waiting in today&apos;s
          service queue.
        </p>
      </div>
    );
  }

  /* ==============================================================
     QUEUE
  ============================================================== */

  return (
    <div
      className="
        space-y-3
      "
    >
      {queue.map(
        (
          item,
          index,
        ) => {
          /* ======================================================
             QUEUE NUMBER
          ======================================================= */

          const queueNumber =
            item.queueNumber ??
            index +
              1;

          /* ======================================================
             PRIORITY
             
             1st = strongest red
             2nd = lighter secondary red
             Rest = standard appointment card
          ======================================================= */

          const isFirst =
            index ===
            0;

          const isSecond =
            index ===
            1;

          /* ======================================================
             NORMALIZED APPOINTMENT
             
             Queue API data already contains the appointment
             information needed by AppointmentCard.
          ======================================================= */

          const appointment =
            {
              ...item,

              /*
               * AppointmentCard uses appointment.id.
               */
              id:
                item.appointmentId ||
                item.id,

              /*
               * Preserve the queue's appointment ID explicitly.
               */
              appointmentId:
                item.appointmentId ||
                item.id,
            };

          return (
            <div
              key={
                item.queueId ||
                item.appointmentId ||
                item.id
              }
              className="
                relative
              "
            >
              {/* ==================================================
                  QUEUE PRIORITY MARKER
              =================================================== */}

              <div
                className={cn(
                  `
                    pointer-events-none
                    absolute
                    -left-2
                    top-3
                    z-20
                    flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    px-2.5
                    py-1
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

                {isFirst
                  ? '1st in line'
                  : isSecond
                    ? '2nd in line'
                    : `Queue #${queueNumber}`}
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
                    pt-1
                    shadow-sm
                    transition-all
                  `,

                  /*
                   * FIRST:
                   * Strong red emphasis.
                   */
                  isFirst &&
                    `
                      border-primary
                      ring-2
                      ring-primary/25
                      shadow-md
                      hover:shadow-lg
                    `,

                  /*
                   * SECOND:
                   * Still red, but clearly subordinate to #1.
                   */
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
                  !isFirst &&
                    !isSecond &&
                    `
                      border-border
                      hover:shadow-md
                    `,
                )}
              >
                {/* =================================================
                    QUEUE / INSPECTION CONTROLS

                    This is the only queue-specific content added
                    to AppointmentCard.

                    The customer, vehicle, tracking, date, time,
                    and status are already supplied by the existing
                    AppointmentCard.
                ================================================== */}

                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    rounded-lg
                    border
                    border-border
                    bg-background/60
                    p-3

                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  {/* ===============================================
                      QUEUE POSITION
                  ============================================== */}

                  <div
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-3
                    "
                  >
                    <div
                      className={cn(
                        `
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          text-lg
                          font-black
                          tabular-nums
                        `,

                        isFirst &&
                          `
                            bg-primary
                            text-primary-foreground
                          `,

                        isSecond &&
                          `
                            border
                            border-primary/25
                            bg-primary/10
                            text-primary
                          `,

                        !isFirst &&
                          !isSecond &&
                          `
                            bg-muted
                            text-foreground
                          `,
                      )}
                      aria-label={`Queue position ${queueNumber}`}
                    >
                      {
                        queueNumber
                      }
                    </div>

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wider
                            text-muted-foreground
                          "
                        >
                          Workshop Queue
                        </span>

                        {isFirst && (
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

                        {isSecond && (
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

                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {isFirst
                          ? 'First appointment in line.'
                          : isSecond
                            ? 'Second appointment in line.'
                            : 'Waiting in scheduled order.'}
                      </p>
                    </div>
                  </div>

                  {/* ===============================================
                      ACTION
                  ============================================== */}

                  <Button
                    type="button"
                    className={cn(
                      `
                        h-11
                        w-full
                        shrink-0
                        rounded-md
                        px-4
                        text-sm
                        font-semibold
                        text-white

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2

                        sm:w-auto
                        md:h-9
                        md:text-xs
                      `,

                      isFirst
                        ? `
                          bg-primary
                          hover:bg-primary/90
                        `
                        : `
                          bg-primary
                          hover:bg-primary/90
                        `,
                    )}
                    onClick={() =>
                      onStartInspection(
                        item.appointmentId ||
                          item.id,
                      )
                    }
                  >
                    <Play className="mr-2 h-4 w-4" />

                    Inspect
                  </Button>
                </div>

                {/* =================================================
                    QUEUE ORDER NOTE
                ================================================== */}

                {(isFirst ||
                  isSecond) && (
                  <div
                    className={cn(
                      `
                        mt-2
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
                      ? 'Next vehicle to be inspected.'
                      : 'Immediately after the first vehicle.'}
                  </div>
                )}
              </AppointmentCard>
            </div>
          );
        },
      )}
    </div>
  );
}