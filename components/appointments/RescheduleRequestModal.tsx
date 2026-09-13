'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Car,
  CheckCircle,
  Clock,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';

import { toast } from 'sonner';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

/* ================================================================
   TYPES
================================================================ */

interface RescheduleRequestModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  appointmentId: string;

  currentDate: string;

  currentTime: string;

  onSuccess: () => void;
}

interface Request {
  id: string;

  appointmentId: string;

  requestedBy:
    | 'customer'
    | 'staff';

  requestedByCustomerId?: string;

  requestedByStaffId?: string;

  newAppointmentDate: string;

  newAppointmentTime: string;

  reason?: string | null;

  rejectionReason?: string | null;

  status:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED';

  createdAt: string;

  updatedAt: string;
}

interface ScheduleAppointment {
  id: string;

  trackingNumber?: string;

  customerId?: string;

  vehicleId?: string;

  appointmentDate: string;

  appointmentTime: string;

  status: string;

  customer?: {
    fullname?: string | null;
  };

  vehicle?: {
    make?: string | null;
    model?: string | null;
    plateNumber?: string | null;
  };
}

type DecisionType =
  | 'APPROVE'
  | 'REJECT'
  | null;

/* ================================================================
   HELPERS
================================================================ */

function formatScheduleDate(
  date: string,
): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const parsed = new Date(
      `${date}T00:00:00`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return date;
    }

    return format(
      parsed,
      'MMMM d, yyyy',
    );
  } catch {
    return date;
  }
}

function formatScheduleTime(
  time: string,
): string {
  if (!time) {
    return 'N/A';
  }

  const normalized =
    time.slice(
      0,
      5,
    );

  const [
    hourText,
    minuteText,
  ] =
    normalized.split(
      ':',
    );

  const hours =
    Number(
      hourText,
    );

  if (
    Number.isNaN(
      hours,
    )
  ) {
    return normalized;
  }

  const minutes =
    minuteText || '00';

  const suffix =
    hours >= 12
      ? 'PM'
      : 'AM';

  const displayHour =
    hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function normalizeTime(
  time: string | null | undefined,
): string {
  return (
    time || ''
  ).slice(
    0,
    5,
  );
}

function isSameAppointmentTime(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return (
    normalizeTime(
      left,
    ) ===
    normalizeTime(
      right,
    )
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function RescheduleRequestModal({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleRequestModalProps) {
  /* ==============================================================
     FORM STATE
  ============================================================== */

  const [
    newDate,
    setNewDate,
  ] = useState(
    currentDate,
  );

  const [
    newTime,
    setNewTime,
  ] = useState(
    currentTime,
  );

  const [
    reason,
    setReason,
  ] = useState('');

  /* ==============================================================
     REQUEST STATE
  ============================================================== */

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    requests,
    setRequests,
  ] = useState<Request[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* ==============================================================
     SCHEDULE STATE
  ============================================================== */

  const [
    allAppointments,
    setAllAppointments,
  ] = useState<
    ScheduleAppointment[]
  >([]);

  const [
    scheduleLoading,
    setScheduleLoading,
  ] = useState(false);

  /* ==============================================================
     SEND CONFIRMATION
  ============================================================== */

  const [
    sendConfirmationOpen,
    setSendConfirmationOpen,
  ] = useState(false);

  /* ==============================================================
     APPROVE / REJECT CONFIRMATION
  ============================================================== */

  const [
    decisionType,
    setDecisionType,
  ] = useState<DecisionType>(
    null,
  );

  const [
    decisionRequest,
    setDecisionRequest,
  ] = useState<Request | null>(
    null,
  );

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState('');

  /* ==============================================================
     CURRENT PENDING REQUEST
  ============================================================== */

  const pendingRequest =
    useMemo(
      () =>
        requests.find(
          (
            request,
          ) =>
            request.status ===
            'PENDING',
        ) || null,
      [
        requests,
      ],
    );

  /* ==============================================================
     LOAD RESCHEDULE REQUESTS
  ============================================================== */

  const loadRequests =
    useCallback(
      async () => {
        if (
          !appointmentId
        ) {
          return;
        }

        setLoading(true);

        try {
          const response =
            await fetch(
              `/api/appointments/${encodeURIComponent(
                appointmentId,
              )}/reschedule-request`,
              {
                method:
                  'GET',

                headers: {
                  Accept:
                    'application/json',
                },

                cache:
                  'no-store',
              },
            );

          if (!response.ok) {
            throw new Error(
              `Failed to load reschedule requests: ${response.status}`,
            );
          }

          const res =
            await response.json();

          if (
            res?.error
          ) {
            toast.error(
              res.errorMessage ||
                'Failed to load reschedule requests.',
            );

            setRequests([]);

            return;
          }

          setRequests(
            Array.isArray(
              res?.data,
            )
              ? res.data
              : [],
          );
        } catch (
          err
        ) {
          console.error(
            'Failed to load reschedule requests:',
            err,
          );

          toast.error(
            'Failed to load reschedule requests.',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        appointmentId,
      ],
    );

  /* ==============================================================
     LOAD APPOINTMENT SCHEDULE
  ============================================================== */

  const loadScheduleContext =
    useCallback(
      async () => {
        setScheduleLoading(
          true,
        );

        try {
          const res =
            await appointmentsApi.list();

          if (
            res.error
          ) {
            setAllAppointments(
              [],
            );

            return;
          }

          setAllAppointments(
            Array.isArray(
              res.data,
            )
              ? res.data
              : [],
          );
        } catch (
          err
        ) {
          console.error(
            'Failed to load appointment schedule:',
            err,
          );

          setAllAppointments(
            [],
          );
        } finally {
          setScheduleLoading(
            false,
          );
        }
      },
      [],
    );

  /* ==============================================================
     OPEN / RESET
  ============================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    setNewDate(
      currentDate,
    );

    setNewTime(
      currentTime,
    );

    setReason('');

    setDecisionType(
      null,
    );

    setDecisionRequest(
      null,
    );

    setRejectionReason('');

    void loadRequests();
    void loadScheduleContext();
  }, [
    open,
    appointmentId,
    currentDate,
    currentTime,
    loadRequests,
    loadScheduleContext,
  ]);

  /* ==============================================================
     TARGET DATE APPOINTMENTS
  ============================================================== */

  const targetDateAppointments =
    useMemo(() => {
      if (!newDate) {
        return [];
      }

      return allAppointments
        .filter(
          (
            appointment,
          ) =>
            appointment.appointmentDate ===
              newDate &&
            appointment.id !==
              appointmentId &&
            appointment.status !==
              'CANCELLED',
        )
        .sort(
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
    }, [
      allAppointments,
      newDate,
      appointmentId,
    ]);

  /* ==============================================================
     PENDING REQUEST TARGET DATE APPOINTMENTS
  ============================================================== */

  const pendingTargetAppointments =
    useMemo(() => {
      if (
        !pendingRequest
      ) {
        return [];
      }

      return allAppointments
        .filter(
          (
            appointment,
          ) =>
            appointment.appointmentDate ===
              pendingRequest.newAppointmentDate &&
            appointment.id !==
              appointmentId &&
            appointment.status !==
              'CANCELLED',
        )
        .sort(
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
    }, [
      allAppointments,
      pendingRequest,
      appointmentId,
    ]);

  /* ==============================================================
     SEND CONFLICTS
  ============================================================== */

  const sendConflicts =
    useMemo(
      () =>
        targetDateAppointments.filter(
          (
            appointment,
          ) =>
            isSameAppointmentTime(
              appointment.appointmentTime,
              newTime,
            ),
        ),
      [
        targetDateAppointments,
        newTime,
      ],
    );

  /* ==============================================================
     APPROVAL CONFLICTS
  ============================================================== */

  const approvalConflicts =
    useMemo(() => {
      if (
        !pendingRequest
      ) {
        return [];
      }

      return pendingTargetAppointments.filter(
        (
          appointment,
        ) =>
          isSameAppointmentTime(
            appointment.appointmentTime,
            pendingRequest.newAppointmentTime,
          ),
      );
    }, [
      pendingTargetAppointments,
      pendingRequest,
    ]);

  /* ==============================================================
     BEGIN SEND
  ============================================================== */

  const beginSubmit =
    () => {
      if (
        !newDate ||
        !newTime
      ) {
        toast.error(
          'Please select a new date and time.',
        );

        return;
      }

      if (
        pendingRequest
      ) {
        toast.error(
          'A pending reschedule request already exists.',
        );

        return;
      }

      setSendConfirmationOpen(
        true,
      );
    };

  /* ==============================================================
     SEND REQUEST
  ============================================================== */

  const handleSubmitConfirmed =
    async () => {
      if (
        !newDate ||
        !newTime
      ) {
        return;
      }

      setSubmitting(
        true,
      );

      try {
        const res =
          await fetch(
            `/api/appointments/${encodeURIComponent(
              appointmentId,
            )}/reschedule-request`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                {
                  newAppointmentDate:
                    newDate,

                  newAppointmentTime:
                    newTime,

                  reason:
                    reason.trim(),
                },
              ),
            },
          );

        const json =
          await res.json();

        if (
          json.error
        ) {
          toast.error(
            json.errorMessage ||
              'Failed to request reschedule.',
          );

          return;
        }

        toast.success(
          'Reschedule request sent.',
        );

        setSendConfirmationOpen(
          false,
        );

        await loadRequests();
        await loadScheduleContext();

        onSuccess();

        onOpenChange(
          false,
        );
      } catch (
        err
      ) {
        console.error(
          'Error submitting reschedule request:',
          err,
        );

        toast.error(
          'Error submitting request.',
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  /* ==============================================================
     OPEN DECISION CONFIRMATION
  ============================================================== */

  const openDecisionConfirmation =
    (
      type: Exclude<
        DecisionType,
        null
      >,
      request: Request,
    ) => {
      setDecisionType(
        type,
      );

      setDecisionRequest(
        request,
      );

      if (
        type ===
        'REJECT'
      ) {
        setRejectionReason(
          '',
        );
      }
    };

  /* ==============================================================
     CLOSE DECISION
  ============================================================== */

  const closeDecisionConfirmation =
    () => {
      if (
        submitting
      ) {
        return;
      }

      setDecisionType(
        null,
      );

      setDecisionRequest(
        null,
      );

      setRejectionReason(
        '',
      );
    };

  /* ==============================================================
     PROCESS APPROVAL / REJECTION
  ============================================================== */

  const handleDecisionConfirmed =
    async () => {
      if (
        !decisionType ||
        !decisionRequest
      ) {
        return;
      }

      if (
        decisionType ===
          'REJECT' &&
        !rejectionReason.trim()
      ) {
        toast.error(
          'A rejection reason is required.',
        );

        return;
      }

      setSubmitting(
        true,
      );

      try {
        const body =
          decisionType ===
          'APPROVE'
            ? {
                action:
                  'approve',
              }
            : {
                action:
                  'reject',

                rejectionReason:
                  rejectionReason.trim(),
              };

        const res =
          await fetch(
            `/api/appointments/reschedule-request/${decisionRequest.id}`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                body,
              ),
            },
          );

        const json =
          await res.json();

        if (
          json.error
        ) {
          toast.error(
            json.errorMessage ||
              `Failed to ${
                decisionType ===
                'APPROVE'
                  ? 'approve'
                  : 'reject'
              } reschedule request.`,
          );

          return;
        }

        if (
          decisionType ===
          'APPROVE'
        ) {
          toast.success(
            'Appointment rescheduled successfully.',
          );
        } else {
          toast.success(
            'Reschedule request rejected.',
          );
        }

        closeDecisionConfirmation();

        await loadRequests();
        await loadScheduleContext();

        onSuccess();

        onOpenChange(
          false,
        );
      } catch (
        err
      ) {
        console.error(
          'Failed to process reschedule decision:',
          err,
        );

        toast.error(
          `Error ${
            decisionType ===
            'APPROVE'
              ? 'approving'
              : 'rejecting'
          } request.`,
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  /* ==============================================================
     STATUS BADGE
  ============================================================== */

  const getStatusBadge =
    (
      status: string,
    ) => {
      const config = {
        PENDING: {
          color:
            'bg-amber-500/15 text-amber-700 dark:text-amber-400',

          label:
            'Pending',
        },

        APPROVED: {
          color:
            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',

          label:
            'Approved',
        },

        REJECTED: {
          color:
            'bg-destructive/15 text-destructive',

          label:
            'Rejected',
        },

        CANCELLED: {
          color:
            'bg-muted text-muted-foreground',

          label:
            'Cancelled',
        },
      };

      const statusConfig =
        config[
          status as keyof typeof config
        ] ||
        config.PENDING;

      return (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent font-medium',
            statusConfig.color,
          )}
        >
          {
            statusConfig.label
          }
        </Badge>
      );
    };

  /* ==============================================================
     SCHEDULE APPOINTMENT LIST
  ============================================================== */

  const renderScheduleAppointments =
    (
      appointmentsForDate: ScheduleAppointment[],
      requestedTime: string,
    ) => {
      if (
        scheduleLoading
      ) {
        return (
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />

              Checking schedule...
            </div>
          </div>
        );
      }

      if (
        appointmentsForDate.length ===
        0
      ) {
        return (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <CalendarDays className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />

            <p className="text-xs font-medium text-muted-foreground">
              No other appointments
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              No active appointments are scheduled on this
              date.
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {appointmentsForDate.map(
            (
              appointment,
            ) => {
              const conflict =
                isSameAppointmentTime(
                  appointment.appointmentTime,
                  requestedTime,
                );

              return (
                <div
                  key={
                    appointment.id
                  }
                  className={cn(
                    'rounded-lg border p-3',
                    conflict
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        conflict
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {conflict ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {appointment.customer
                            ?.fullname ||
                            'Customer'}
                        </p>

                        {appointment.status && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-border px-2 text-[9px]"
                          >
                            {
                              appointment.status
                            }
                          </Badge>
                        )}

                        {conflict && (
                          <Badge
                            variant="outline"
                            className="
                              rounded-full
                              border-amber-500/30
                              bg-amber-500/10
                              px-2
                              text-[9px]
                              font-semibold
                              text-amber-700
                              dark:text-amber-400
                            "
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />

                            Same time
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />

                          {formatScheduleTime(
                            appointment.appointmentTime,
                          )}
                        </span>

                        {appointment.vehicle
                          ?.plateNumber && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />

                            {
                              appointment
                                .vehicle
                                .plateNumber
                            }
                          </span>
                        )}

                        {appointment.trackingNumber && (
                          <span>
                            #
                            {
                              appointment.trackingNumber
                            }
                          </span>
                        )}
                      </div>

                      {conflict && (
                        <p className="mt-2 text-[11px] leading-4 text-amber-700 dark:text-amber-400">
                          This appointment starts at the same
                          requested time. Final overlap validation
                          should still be performed by the server.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      );
    };

  /* ==============================================================
     SHARED SCROLL CONTAINER
     
     IMPORTANT:
     We intentionally use native overflow scrolling instead of
     Radix ScrollArea here.

     This combination is reliable across:
     - iOS Safari
     - Android Chrome
     - Desktop Chrome
     - Desktop Edge
     - Firefox
     - macOS Safari
     - resized browser windows
     - dynamic viewport-height devices
  ============================================================== */

  const scrollContainerClassName =
    'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]';

  /* ==============================================================
     MAIN UI
  ============================================================== */

  return (
    <>
      {/* ==========================================================
          MAIN RESCHEDULE REQUEST MODAL
      =========================================================== */}

      <Dialog
        open={
          open
        }
        onOpenChange={
          onOpenChange
        }
      >
        <DialogContent
          className="
            flex
            h-[calc(100dvh-1rem)]
            max-h-[calc(100dvh-1rem)]
            w-[calc(100vw-1rem)]
            max-w-none
            flex-col
            gap-0
            overflow-hidden
            rounded-2xl
            p-0

            sm:h-auto
            sm:max-h-[calc(100dvh-2rem)]
            sm:w-[calc(100vw-2rem)]
            sm:max-w-2xl
            sm:rounded-xl

            md:max-h-[calc(100dvh-3rem)]
          "
        >
          {/* ========================================================
              HEADER
          ========================================================= */}

          <DialogHeader
            className="
              shrink-0
              border-b
              border-border
              bg-background/95
              p-4
              backdrop-blur-xl

              sm:bg-card
              sm:backdrop-blur-none

              md:p-5
            "
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Reschedule Request
                </DialogTitle>

                <DialogDescription className="mt-1 text-xs leading-5">
                  Review the current appointment and request a new
                  schedule.
                </DialogDescription>
              </div>
            </div>

            {/* Current appointment */}
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current appointment
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {formatScheduleDate(
                      currentDate,
                    )}
                  </p>
                </div>

                <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />

                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Time
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />

                    {formatScheduleTime(
                      currentTime,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* ========================================================
              NATIVE SCROLLABLE BODY
          ========================================================= */}

          <div
            className={
              scrollContainerClassName
            }
          >
            <div className="space-y-5 p-4 pb-6 md:p-5 md:pb-8">
              {/* ====================================================
                  REQUEST FORM
              ===================================================== */}

              <section
                className={cn(
                  'rounded-xl border border-border bg-card p-4',
                  pendingRequest &&
                    'opacity-60',
                )}
              >
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">
                    Request a new schedule
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select the replacement date, time, and reason.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* New Date */}
                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Date
                    </Label>

                    <Input
                      type="date"
                      value={
                        newDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewDate(
                          event.target.value,
                        )
                      }
                      disabled={
                        !!pendingRequest ||
                        submitting
                      }
                      className="
                        h-11
                        rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:h-9
                        md:text-sm
                      "
                    />
                  </div>

                  {/* New Time */}
                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Time
                    </Label>

                    <Input
                      type="time"
                      value={
                        newTime
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewTime(
                          event.target.value,
                        )
                      }
                      disabled={
                        !!pendingRequest ||
                        submitting
                      }
                      className="
                        h-11
                        rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:h-9
                        md:text-sm
                      "
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reason
                    </Label>

                    <Textarea
                      value={
                        reason
                      }
                      onChange={(
                        event,
                      ) =>
                        setReason(
                          event.target.value,
                        )
                      }
                      disabled={
                        !!pendingRequest ||
                        submitting
                      }
                      placeholder="Why does this appointment need to be rescheduled?"
                      className="
                        min-h-[100px]
                        rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:text-sm
                      "
                    />
                  </div>
                </div>
              </section>

              {/* ====================================================
                  SCHEDULE PREVIEW
              ===================================================== */}

              {!pendingRequest &&
                newDate &&
                newTime && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />

                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Schedule Preview
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            Requested replacement
                          </p>

                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatScheduleDate(
                              newDate,
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatScheduleTime(
                              newTime,
                            )}
                          </p>
                        </div>

                        {sendConflicts.length >
                          0 && (
                          <Badge
                            variant="outline"
                            className="
                              w-fit
                              rounded-full
                              border-amber-500/30
                              bg-amber-500/10
                              text-amber-700
                              dark:text-amber-400
                            "
                          >
                            <AlertTriangle className="mr-1.5 h-3 w-3" />

                            {
                              sendConflicts.length
                            }{' '}
                            same-time conflict
                            {sendConflicts.length ===
                            1
                              ? ''
                              : 's'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Appointments on requested date
                      </p>

                      {renderScheduleAppointments(
                        targetDateAppointments,
                        newTime,
                      )}
                    </div>
                  </section>
                )}

              {/* ====================================================
                  EXISTING PENDING REQUEST
              ===================================================== */}

              {pendingRequest && (
                <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Clock className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Pending reschedule request
                        </p>

                        {getStatusBadge(
                          pendingRequest.status,
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-amber-500/20 bg-background/40 p-3">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Current
                          </p>

                          <p className="mt-1 text-xs font-semibold text-foreground">
                            {formatScheduleDate(
                              currentDate,
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatScheduleTime(
                              currentTime,
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            Requested
                          </p>

                          <p className="mt-1 text-xs font-semibold text-foreground">
                            {formatScheduleDate(
                              pendingRequest.newAppointmentDate,
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatScheduleTime(
                              pendingRequest.newAppointmentTime,
                            )}
                          </p>
                        </div>
                      </div>

                      {pendingRequest.reason && (
                        <div className="mt-3 rounded-lg border border-amber-500/20 bg-background/40 p-3">
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Reason
                              </p>

                              <p className="mt-1 text-xs leading-5 text-foreground">
                                {
                                  pendingRequest.reason
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ====================================================
                  PENDING REQUEST TARGET DATE
              ===================================================== */}

              {pendingRequest && (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />

                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Requested Date Schedule
                    </p>
                  </div>

                  {approvalConflicts.length >
                    0 && (
                    <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

                        <div>
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            Potential overlap detected
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-amber-700 dark:text-amber-400">
                            {
                              approvalConflicts.length
                            }{' '}
                            active appointment
                            {approvalConflicts.length ===
                            1
                              ? ''
                              : 's'}{' '}
                            starts at the requested time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {renderScheduleAppointments(
                    pendingTargetAppointments,
                    pendingRequest.newAppointmentTime,
                  )}
                </section>
              )}

              {/* ====================================================
                  REQUEST HISTORY
              ===================================================== */}

              {requests.length >
                0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Request History
                    </p>

                    {loading && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-2">
                    {requests.map(
                      (
                        request,
                      ) => (
                        <div
                          key={
                            request.id
                          }
                          className="rounded-xl border border-border bg-card p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {request.requestedBy ===
                                  'customer'
                                    ? 'Customer'
                                    : 'Staff'}
                                </span>

                                {getStatusBadge(
                                  request.status,
                                )}
                              </div>

                              <p className="mt-2 text-sm font-medium text-foreground">
                                To{' '}
                                {formatScheduleDate(
                                  request.newAppointmentDate,
                                )}{' '}
                                at{' '}
                                {formatScheduleTime(
                                  request.newAppointmentTime,
                                )}
                              </p>

                              {request.reason && (
                                <p className="mt-1 text-xs leading-5 italic text-muted-foreground">
                                  Reason:{' '}
                                  {
                                    request.reason
                                  }
                                </p>
                              )}

                              {request.rejectionReason && (
                                <p className="mt-2 rounded-md bg-destructive/5 p-2 text-xs leading-5 text-destructive">
                                  Rejection reason:{' '}
                                  {
                                    request.rejectionReason
                                  }
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {format(
                                new Date(
                                  request.createdAt,
                                ),
                                'MMM d, h:mm a',
                              )}
                            </span>
                          </div>

                          {request.status ===
                            'PENDING' && (
                            <div className="mt-3 border-t border-border pt-3">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    openDecisionConfirmation(
                                      'APPROVE',
                                      request,
                                    )
                                  }
                                  disabled={
                                    submitting
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

                                  Approve
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openDecisionConfirmation(
                                      'REJECT',
                                      request,
                                    )
                                  }
                                  disabled={
                                    submitting
                                  }
                                  className="
                                    h-10
                                    rounded-md
                                    border-destructive/40
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
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* ========================================================
              MAIN FOOTER
          ========================================================= */}

          <DialogFooter
            className="
              shrink-0
              border-t
              border-border
              bg-card
              p-3
              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
              md:p-4
              md:pb-[calc(1rem+env(safe-area-inset-bottom))]
            "
          >
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  onOpenChange(
                    false,
                  )
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-md px-4 md:h-9"
              >
                Close
              </Button>

              {!pendingRequest && (
                <Button
                  type="button"
                  onClick={
                    beginSubmit
                  }
                  disabled={
                    submitting ||
                    !newDate ||
                    !newTime
                  }
                  className="h-11 rounded-md px-4 text-sm font-semibold md:h-9"
                >
                  <CalendarClock className="h-4 w-4" />

                  Review & Send Request
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          SEND REQUEST CONFIRMATION
      ============================================================= */}

      <Dialog
        open={
          sendConfirmationOpen
        }
        onOpenChange={(
          nextOpen,
        ) => {
          if (
            submitting
          ) {
            return;
          }

          setSendConfirmationOpen(
            nextOpen,
          );
        }}
      >
        <DialogContent
          className="
            flex
            h-[calc(100dvh-1rem)]
            max-h-[calc(100dvh-1rem)]
            w-[calc(100vw-1rem)]
            max-w-none
            flex-col
            gap-0
            overflow-hidden
            rounded-2xl
            p-0

            sm:h-auto
            sm:max-h-[calc(100dvh-2rem)]
            sm:w-[calc(100vw-2rem)]
            sm:max-w-xl
            sm:rounded-xl

            md:max-h-[calc(100dvh-3rem)]
          "
        >
          <DialogHeader className="shrink-0 border-b border-border bg-card p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarClock className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Confirm Reschedule Request
                </DialogTitle>

                <DialogDescription className="mt-1 text-xs leading-5">
                  Review all details before sending this request.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div
            className={
              scrollContainerClassName
            }
          >
            <div className="space-y-4 p-4 pb-6 md:p-5 md:pb-8">
              {/* Schedule comparison */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current schedule
                  </p>

                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {formatScheduleDate(
                      currentDate,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatScheduleTime(
                      currentTime,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    New schedule
                  </p>

                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {formatScheduleDate(
                      newDate,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatScheduleTime(
                      newTime,
                    )}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Reschedule reason
                    </p>

                    <p className="mt-1 text-xs leading-5 text-foreground">
                      {reason.trim() ||
                        'No reason provided.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conflict */}
              {sendConflicts.length >
              0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Potential schedule conflict
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                        {
                          sendConflicts.length
                        }{' '}
                        active appointment
                        {sendConflicts.length ===
                        1
                          ? ''
                          : 's'}{' '}
                        already starts at the requested time.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        No same-time appointment found
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                        No active appointment starts at the
                        requested time.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date schedule */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Requested Date Schedule
                  </p>
                </div>

                {renderScheduleAppointments(
                  targetDateAppointments,
                  newTime,
                )}
              </section>

              {/* Information */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Sending this request does not immediately
                    change the appointment. The request must be
                    approved before the appointment schedule is
                    changed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter
            className="
              shrink-0
              border-t
              border-border
              bg-card
              p-3
              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
              md:p-4
              md:pb-[calc(1rem+env(safe-area-inset-bottom))]
            "
          >
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setSendConfirmationOpen(
                    false,
                  )
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-md px-4 md:h-9"
              >
                Go Back
              </Button>

              <Button
                type="button"
                onClick={
                  handleSubmitConfirmed
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 md:h-9"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />

                    Sending...
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" />

                    Confirm & Send
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          APPROVE / DECLINE CONFIRMATION
      ============================================================= */}

      <Dialog
        open={
          !!decisionType &&
          !!decisionRequest
        }
        onOpenChange={(
          nextOpen,
        ) => {
          if (
            !nextOpen
          ) {
            closeDecisionConfirmation();
          }
        }}
      >
        <DialogContent
          className="
            flex
            h-[calc(100dvh-1rem)]
            max-h-[calc(100dvh-1rem)]
            w-[calc(100vw-1rem)]
            max-w-none
            flex-col
            gap-0
            overflow-hidden
            rounded-2xl
            p-0

            sm:h-auto
            sm:max-h-[calc(100dvh-2rem)]
            sm:w-[calc(100vw-2rem)]
            sm:max-w-2xl
            sm:rounded-xl

            md:max-h-[calc(100dvh-3rem)]
          "
        >
          <DialogHeader className="shrink-0 border-b border-border bg-card p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  decisionType ===
                    'APPROVE'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {decisionType ===
                'APPROVE' ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {decisionType ===
                  'APPROVE'
                    ? 'Approve Reschedule?'
                    : 'Decline Reschedule?'}
                </DialogTitle>

                <DialogDescription className="mt-1 text-xs leading-5">
                  Review the schedule and confirm that this
                  decision is intentional and accountable.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div
            className={
              scrollContainerClassName
            }
          >
            <div className="space-y-4 p-4 pb-6 md:p-5 md:pb-8">
              {decisionRequest && (
                <>
                  {/* Accountability */}
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      decisionType ===
                        'APPROVE'
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-destructive/25 bg-destructive/5',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {decisionType ===
                      'APPROVE' ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}

                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            decisionType ===
                              'APPROVE'
                              ? 'text-emerald-800 dark:text-emerald-300'
                              : 'text-destructive',
                          )}
                        >
                          {decisionType ===
                          'APPROVE'
                            ? 'You are about to approve this reschedule.'
                            : 'You are about to decline this reschedule.'}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          This action should only be completed after
                          reviewing the requested schedule, reason,
                          and existing appointments on the requested
                          date.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Request details */}
                  <section className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />

                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Reschedule Details
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Current
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatScheduleDate(
                            currentDate,
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatScheduleTime(
                            currentTime,
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          Requested
                        </p>

                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatScheduleDate(
                            decisionRequest.newAppointmentDate,
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatScheduleTime(
                            decisionRequest.newAppointmentTime,
                          )}
                        </p>
                      </div>
                    </div>

                    {decisionRequest.reason && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Reason
                            </p>

                            <p className="mt-1 text-xs leading-5 text-foreground">
                              {
                                decisionRequest.reason
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Conflict */}
                  {approvalConflicts.length >
                    0 ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Potential schedule conflict
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                            {
                              approvalConflicts.length
                            }{' '}
                            active appointment
                            {approvalConflicts.length ===
                            1
                              ? ''
                              : 's'}{' '}
                            starts at the requested time.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                        <div>
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            No same-time conflict found
                          </p>

                          <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                            No active appointment starts at the
                            requested time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing target-date appointments */}
                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />

                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        All Appointments on Requested Date
                      </p>
                    </div>

                    {renderScheduleAppointments(
                      pendingTargetAppointments,
                      decisionRequest.newAppointmentTime,
                    )}
                  </section>

                  {/* Reject reason */}
                  {decisionType ===
                    'REJECT' && (
                    <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                      <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Rejection Reason
                      </Label>

                      <Textarea
                        value={
                          rejectionReason
                        }
                        onChange={(
                          event,
                        ) =>
                          setRejectionReason(
                            event.target.value,
                          )
                        }
                        disabled={
                          submitting
                        }
                        placeholder="Explain why this reschedule request is being declined..."
                        className="
                          min-h-[100px]
                          rounded-md
                          bg-background
                          text-base
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          md:text-sm
                        "
                        autoFocus
                      />
                    </section>
                  )}

                  {/* Accountability information */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                      <p className="text-[11px] leading-5 text-muted-foreground">
                        Your confirmation will be submitted as the
                        decision for this reschedule request. Review
                        all displayed information before continuing.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Decision footer */}
          <DialogFooter
            className="
              shrink-0
              border-t
              border-border
              bg-card
              p-3
              pb-[calc(0.75rem+env(safe-area-inset-bottom))]
              md:p-4
              md:pb-[calc(1rem+env(safe-area-inset-bottom))]
            "
          >
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={
                  closeDecisionConfirmation
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-md px-4 md:h-9"
              >
                Go Back
              </Button>

              <Button
                type="button"
                onClick={
                  handleDecisionConfirmed
                }
                disabled={
                  submitting ||
                  (decisionType ===
                    'REJECT' &&
                    !rejectionReason.trim())
                }
                className={cn(
                  'h-11 rounded-md px-4 font-semibold md:h-9',
                  decisionType ===
                    'APPROVE'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                )}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />

                    Processing...
                  </>
                ) : decisionType ===
                  'APPROVE' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />

                    Confirm Approval
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />

                    Confirm Decline
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}