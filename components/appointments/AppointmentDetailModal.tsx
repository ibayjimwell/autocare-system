'use client';

import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import {
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import AppointmentSectionHeader from './AppointmentSectionHeader';
import AppointmentInfoCard from './AppointmentInfoCard';
import AppointmentServicesCard from './AppointmentServicesCard';
import AppointmentCustomerCard from './AppointmentCustomerCard';
import AppointmentVehicleCard from './AppointmentVehicleCard';
import AppointmentHistoryCard from './AppointmentHistoryCard';
import AppointmentMilestonesCard from './AppointmentMilestonesCard';
import AppointmentQueueCard from './AppointmentQueueCard';
import AppointmentTasksCard from './AppointmentTasksCard';
import AppointmentFindingsCard from './AppointmentFindingsCard';
import EstimateCostCard from './EstimateCostCard';
import FinalCostCard from './FinalCostCard';

interface AppointmentDetailModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  loading: boolean;

  refreshing: boolean;

  appointment: any;

  customer: any;

  vehicle: any;

  services: any[];

  history: any[];

  inspectionTasks: any[];

  workTasks: any[];

  findings: any[];

  estimate: any;

  finalBill: any;

  queue: any[];

  enabledSections: Record<
    string,
    boolean
  >;

  confirmationLog: any;

  inspectionLog: any;

  waitingApprovalLog: any;

  inProgressLog: any;

  completedLog: any;

  estimateSentAt?: any;

  estimateSentBy?: any;

  estimateApprovedAt?: any;

  estimateApprovedBy?: any;

  onRefresh: () => Promise<void>;
}

function statusLabel(
  value: any
) {
  return String(
    value ||
      'PENDING'
  ).replace(
    /_/g,
    ' '
  );
}

export default function AppointmentDetailModal({
  open,
  onOpenChange,

  loading,
  refreshing,

  appointment,

  customer,
  vehicle,
  services,

  history,

  inspectionTasks,
  workTasks,
  findings,

  estimate,
  finalBill,

  queue,

  enabledSections,

  confirmationLog,
  inspectionLog,
  waitingApprovalLog,
  inProgressLog,
  completedLog,

  estimateSentAt,
  estimateSentBy,

  estimateApprovedAt,
  estimateApprovedBy,

  onRefresh,
}: AppointmentDetailModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          flex
          flex-col
          overflow-hidden

          rounded-xl
          border-border
          bg-background
          p-0
          shadow-2xl

          /* =====================================================
             MOBILE
             Almost full screen while preserving a small margin.
          ====================================================== */

          !h-[calc(100dvh-1rem)]
          !max-h-[calc(100dvh-1rem)]
          !w-[calc(100vw-1rem)]
          !max-w-none

          /* =====================================================
             SMALL TABLET
          ====================================================== */

          sm:!h-[calc(100dvh-2rem)]
          sm:!max-h-[calc(100dvh-2rem)]
          sm:!w-[calc(100vw-2rem)]

          /* =====================================================
             DESKTOP

             IMPORTANT:
             The ! modifier is intentional.

             shadcn DialogContent commonly contains a default
             max-w-lg class. Without !max-w / !w, that default
             constraint can keep the dialog narrow.
          ====================================================== */

          lg:!h-[92dvh]
          lg:!max-h-[92dvh]
          lg:!w-[94vw]
          lg:!max-w-[1800px]

          /* =====================================================
             LARGE DESKTOP
          ====================================================== */

          xl:!w-[95vw]
          xl:!max-w-[1900px]

          /* =====================================================
             VERY LARGE DESKTOP
          ====================================================== */

          2xl:!w-[96vw]
          2xl:!max-w-[2000px]
        "
      >
        {/* =========================================================
            FIXED HEADER
        ========================================================== */}

        <DialogHeader
          className="
            shrink-0
            border-b
            border-border
            bg-card

            px-4
            py-4

            sm:px-6
            sm:py-5

            lg:px-7
            lg:py-5

            xl:px-8
          "
        >
          <div
            className="
              flex
              min-w-0
              items-start
              justify-between
              gap-3
            "
          >
            {/* =====================================================
                TITLE AREA
            ====================================================== */}

            <div
              className="
                flex
                min-w-0
                flex-1
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
                  rounded-lg
                  bg-primary/10
                  text-primary

                  sm:h-11
                  sm:w-11
                "
              >
                <Eye
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className="
                    flex
                    min-w-0
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <DialogTitle
                    className="
                      min-w-0
                      truncate
                      text-base
                      font-semibold
                      tracking-tight
                      text-foreground

                      sm:text-lg

                      lg:text-xl
                    "
                  >
                    Appointment Details
                  </DialogTitle>

                  {appointment && (
                    <Badge
                      className="
                        shrink-0
                        rounded-full
                        px-2
                        py-1
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-wide

                        sm:px-2.5
                        sm:text-[10px]
                      "
                    >
                      {statusLabel(
                        appointment.status
                      )}
                    </Badge>
                  )}
                </div>

                <DialogDescription
                  className="
                    mt-1
                    hidden
                    text-xs
                    leading-5
                    text-muted-foreground

                    sm:block
                    sm:text-sm
                  "
                >
                  Full read-only appointment
                  information, activity history,
                  service progress, costing,
                  and billing.
                </DialogDescription>

                {appointment?.trackingNumber && (
                  <p
                    className="
                      mt-1.5
                      font-mono
                      text-[10px]
                      font-semibold
                      text-muted-foreground

                      sm:mt-2
                      sm:text-[11px]
                    "
                  >
                    #
                    {
                      appointment.trackingNumber
                    }
                  </p>
                )}
              </div>
            </div>

            {/* =====================================================
                HEADER ACTIONS

                Only Refresh is rendered here.

                DialogContent already renders its own close
                button, so there is intentionally NO custom X.
            ====================================================== */}

            <div
              className="
                flex
                shrink-0
                items-center
                gap-1
              "
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void onRefresh()
                }
                disabled={
                  loading ||
                  refreshing
                }
                className="
                  h-10
                  shrink-0
                  rounded-md
                  px-3

                  sm:h-9
                "
              >
                {refreshing ? (
                  <Loader2
                    className="
                      mr-2
                      h-4
                      w-4
                      animate-spin
                    "
                  />
                ) : (
                  <RefreshCw
                    className="
                      mr-2
                      h-4
                      w-4
                    "
                  />
                )}

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* =========================================================
            RELIABLE SCROLL CONTAINER

            This intentionally uses native overflow instead of
            Radix ScrollArea.

            flex-1 + min-h-0 are important because they allow this
            element to take the remaining dialog height.

            overflow-y-auto guarantees vertical scrolling.

            overflow-x-hidden prevents accidental horizontal
            scrolling from child cards/content.

            overscroll-contain keeps the scroll interaction inside
            the modal.

            touch scrolling remains smooth on mobile.
        ========================================================== */}

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
          {loading ? (
            /* =====================================================
               LOADING
            ====================================================== */

            <div
              className="
                flex
                min-h-[60vh]
                items-center
                justify-center
                p-6

                sm:p-8
              "
            >
              <div
                className="
                  w-full
                  max-w-sm
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-primary/10
                  "
                >
                  <Loader2
                    className="
                      h-7
                      w-7
                      animate-spin
                      text-primary
                    "
                  />
                </div>

                <p
                  className="
                    mt-4
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Loading appointment
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-muted-foreground
                  "
                >
                  Loading the appointment,
                  history, customer, vehicle,
                  queue, tasks, findings and
                  billing information.
                </p>
              </div>
            </div>
          ) : !appointment ? (
            /* =====================================================
               EMPTY / ERROR
            ====================================================== */

            <div
              className="
                flex
                min-h-[60vh]
                items-center
                justify-center
                p-6

                sm:p-8
              "
            >
              <div
                className="
                  w-full
                  max-w-sm
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-destructive/10
                  "
                >
                  <AlertCircle
                    className="
                      h-7
                      w-7
                      text-destructive
                    "
                  />
                </div>

                <p
                  className="
                    mt-4
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  Appointment unavailable
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-muted-foreground
                  "
                >
                  The latest appointment
                  information could not be
                  loaded.
                </p>
              </div>
            </div>
          ) : (
            /* =====================================================
               MAIN CONTENT
            ====================================================== */

            <div
              className="
                w-full
                space-y-6

                p-4

                sm:p-6

                lg:space-y-7
                lg:p-7

                xl:p-8

                2xl:p-9
              "
            >
              {/* ===================================================
                  01 APPOINTMENT INFORMATION
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="01"
                  title="Appointment Information"
                  description="Booking details and appointment metadata"
                />

                <AppointmentInfoCard
                  appointment={
                    appointment
                  }
                />
              </section>

              {/* ===================================================
                  02 CUSTOMER + VEHICLE
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="02"
                  title="Customer & Vehicle"
                  description="The customer and vehicle assigned to this appointment"
                />

                <div
                  className="
                    grid
                    min-w-0
                    grid-cols-1
                    gap-4

                    lg:grid-cols-2
                  "
                >
                  <AppointmentCustomerCard
                    customer={
                      customer ||
                      appointment?.customer
                    }
                  />

                  <AppointmentVehicleCard
                    vehicle={
                      vehicle ||
                      appointment?.vehicle
                    }
                  />
                </div>
              </section>

              {/* ===================================================
                  03 SERVICES
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="03"
                  title="Services Booked"
                  description="All services selected when the appointment was created"
                />

                <AppointmentServicesCard
                  services={
                    services
                  }
                />
              </section>

              {/* ===================================================
                  04 HISTORY
                  ALWAYS VISIBLE
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="04"
                  title="Appointment Logs"
                  description="Every status transition recorded for this appointment"
                  live
                />

                <AppointmentHistoryCard
                  history={
                    history
                  }
                />
              </section>

              {/* ===================================================
                  05 MILESTONES
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="05"
                  title="Appointment Milestones"
                  description="Important service journey events derived from appointment history and payment data"
                  enabled={
                    enabledSections.confirmation ||
                    enabledSections.inspection ||
                    enabledSections.estimate ||
                    enabledSections.approval
                  }
                />

                <AppointmentMilestonesCard
                  confirmationLog={
                    confirmationLog
                  }
                  inspectionLog={
                    inspectionLog
                  }
                  waitingApprovalLog={
                    waitingApprovalLog
                  }
                  inProgressLog={
                    inProgressLog
                  }
                  completedLog={
                    completedLog
                  }
                  estimateSentAt={
                    estimateSentAt
                  }
                  estimateSentBy={
                    estimateSentBy
                  }
                  estimateApprovedAt={
                    estimateApprovedAt
                  }
                  estimateApprovedBy={
                    estimateApprovedBy
                  }
                  enabled={
                    enabledSections.confirmation ||
                    enabledSections.inspection ||
                    enabledSections.estimate ||
                    enabledSections.approval
                  }
                />
              </section>

              {/* ===================================================
                  06 QUEUE
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="06"
                  title="Service Queue"
                  description="Live queue position and surrounding confirmed appointments"
                  enabled={
                    enabledSections.queue
                  }
                  live={
                    enabledSections.queue
                  }
                />

                <AppointmentQueueCard
                  queue={
                    queue
                  }
                  appointmentId={
                    appointment.id
                  }
                  enabled={
                    enabledSections.queue
                  }
                />
              </section>

              {/* ===================================================
                  07 INSPECTION TASKS
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="07"
                  title="Inspection Tasks"
                  description="Inspection task list and current status"
                  enabled={
                    enabledSections.inspection
                  }
                  live={
                    enabledSections.inspection
                  }
                />

                <AppointmentTasksCard
                  title="Inspection tasks"
                  tasks={
                    inspectionTasks
                  }
                  enabled={
                    enabledSections.inspection
                  }
                />
              </section>

              {/* ===================================================
                  08 ESTIMATE
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="08"
                  title="Estimate Cost"
                  description="The complete estimate currently associated with the appointment"
                  enabled={
                    enabledSections.estimate
                  }
                  live={
                    enabledSections.estimate
                  }
                />

                <EstimateCostCard
                  estimate={
                    estimate
                  }
                  enabled={
                    enabledSections.estimate
                  }
                />
              </section>

              {/* ===================================================
                  09 FINDINGS
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="09"
                  title="Detailed Findings"
                  description="Inspection findings with attached items and parts"
                  enabled={
                    enabledSections.findings
                  }
                  live={
                    enabledSections.findings
                  }
                />

                <AppointmentFindingsCard
                  findings={
                    findings
                  }
                  enabled={
                    enabledSections.findings
                  }
                />
              </section>

              {/* ===================================================
                  10 WORK TASKS
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="10"
                  title="Work Tasks"
                  description="Repair/work tasks and their realtime status"
                  enabled={
                    enabledSections.work
                  }
                  live={
                    enabledSections.work
                  }
                />

                <AppointmentTasksCard
                  title="Work tasks"
                  tasks={
                    workTasks
                  }
                  enabled={
                    enabledSections.work
                  }
                />
              </section>

              {/* ===================================================
                  11 Final Cost
              ==================================================== */}

              <section className="space-y-3">
                <AppointmentSectionHeader
                  number="11"
                  title="Final Cost"
                  description="Final Cost and payment status"
                  enabled={
                    enabledSections.finalBill
                  }
                  live={
                    enabledSections.finalBill
                  }
                />

                <FinalCostCard
                  finalBill={
                    finalBill
                  }
                  enabled={
                    enabledSections.finalBill
                  }
                />
              </section>

              {/* ===================================================
                  REALTIME FOOTER
              ==================================================== */}

              <div
                className="
                  rounded-xl
                  border
                  border-primary/15
                  bg-primary/5

                  p-4

                  sm:p-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <div
                    className="
                      relative
                      mt-1
                      flex
                      h-2
                      w-2
                      shrink-0
                    "
                  >
                    <span
                      className="
                        absolute
                        inline-flex
                        h-2
                        w-2
                        animate-ping
                        rounded-full
                        bg-primary/50
                      "
                    />

                    <span
                      className="
                        relative
                        inline-flex
                        h-2
                        w-2
                        rounded-full
                        bg-primary
                      "
                    />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="
                        text-xs
                        font-semibold
                        text-foreground
                      "
                    >
                      Realtime appointment view
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-muted-foreground
                      "
                    >
                      This modal listens for
                      appointment,
                      appointment-history,
                      queue,
                      inspection-task,
                      work-task,
                      finding,
                      estimate, and
                      final-bill changes
                      while it is open.
                    </p>
                  </div>
                </div>
              </div>

              {/* ===================================================
                  BOTTOM SAFE SPACE
              ==================================================== */}

              <div
                className="
                  h-2

                  sm:h-3

                  lg:h-4
                "
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}