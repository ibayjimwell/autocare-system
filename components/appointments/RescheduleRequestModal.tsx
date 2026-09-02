'use client';

import React, {
  useState,
  useEffect,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';
import { format } from 'date-fns';

import {
  Clock,
  CalendarDays,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  reason?: string;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export default function RescheduleRequestModal({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleRequestModalProps) {
  const [newDate, setNewDate] =
    useState(currentDate);

  const [newTime, setNewTime] =
    useState(currentTime);

  const [reason, setReason] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [requests, setRequests] =
    useState<Request[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [pendingRequest, setPendingRequest] =
    useState<Request | null>(null);

  const loadRequests = async () => {
    if (!appointmentId) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/appointments/${appointmentId}/reschedule-request`,
      );

      const json = await res.json();

      if (!json.error) {
        setRequests(json.data || []);

        const pending =
          json.data?.find(
            (r: any) =>
              r.status === 'PENDING',
          );

        setPendingRequest(
          pending || null,
        );
      }
    } catch (err) {
      console.error(
        'Failed to load reschedule requests:',
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [
    open,
    appointmentId,
  ]);

  const handleSubmit =
    async () => {
      if (!newDate || !newTime) {
        toast.error(
          'Please select a new date and time.',
        );
        return;
      }

      if (pendingRequest) {
        toast.error(
          'A pending reschedule request already exists.',
        );
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch(
          `/api/appointments/${appointmentId}/reschedule-request`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              newAppointmentDate:
                newDate,
              newAppointmentTime:
                newTime,
              reason,
            }),
          },
        );

        const json = await res.json();

        if (json.error) {
          toast.error(
            json.errorMessage ||
              'Failed to request reschedule.',
          );
        } else {
          toast.success(
            'Reschedule request sent.',
          );

          await loadRequests();
          onSuccess();
          onOpenChange(false);
        }
      } catch (err) {
        toast.error(
          'Error submitting request.',
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleApprove =
    async (
      requestId: string,
    ) => {
      setSubmitting(true);

      try {
        const res = await fetch(
          `/api/appointments/reschedule-request/${requestId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              action: 'approve',
            }),
          },
        );

        const json = await res.json();

        if (json.error) {
          toast.error(
            json.errorMessage ||
              'Failed to approve.',
          );
        } else {
          toast.success(
            'Appointment rescheduled successfully.',
          );

          await loadRequests();
          onSuccess();
          onOpenChange(false);
        }
      } catch (err) {
        toast.error(
          'Error approving request.',
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleReject =
    async (
      requestId: string,
    ) => {
      const rejectionReason =
        prompt(
          'Please provide a reason for rejecting:',
        );

      if (rejectionReason === null)
        return;

      if (!rejectionReason.trim()) {
        toast.error(
          'A reason is required for rejection.',
        );
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch(
          `/api/appointments/reschedule-request/${requestId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              action: 'reject',
              rejectionReason:
                rejectionReason.trim(),
            }),
          },
        );

        const json = await res.json();

        if (json.error) {
          toast.error(
            json.errorMessage ||
              'Failed to reject.',
          );
        } else {
          toast.success(
            'Reschedule request rejected.',
          );

          await loadRequests();
          onSuccess();
          onOpenChange(false);
        }
      } catch (err) {
        toast.error(
          'Error rejecting request.',
        );
      } finally {
        setSubmitting(false);
      }
    };

  const getStatusBadge = (
    status: string,
  ) => {
    const config = {
      PENDING: {
        color:
          'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        label: 'Pending',
      },
      APPROVED: {
        color:
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        label: 'Approved',
      },
      REJECTED: {
        color:
          'bg-destructive/15 text-destructive',
        label: 'Rejected',
      },
      CANCELLED: {
        color:
          'bg-muted text-muted-foreground',
        label: 'Cancelled',
      },
    };

    const {
      color,
      label,
    } =
      config[
        status as keyof typeof config
      ] || config.PENDING;

    return (
      <Badge
        variant="outline"
        className={cn(
          'border-transparent font-medium',
          color,
        )}
      >
        {label}
      </Badge>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        className="
          max-h-[100dvh]
          overflow-hidden
          rounded-none p-0
          sm:max-h-[90vh]
          sm:max-w-lg
          sm:rounded-xl
        "
      >
        <DialogHeader
          className="
            shrink-0
            border-b border-border
            bg-background/80
            p-4 backdrop-blur-xl
            sm:bg-card sm:backdrop-blur-none
            md:p-5
          "
        >
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <CalendarDays className="h-5 w-5 text-primary" />
            Reschedule Request
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            Current appointment:{' '}
            <span className="font-medium text-foreground">
              {currentDate}
            </span>{' '}
            at{' '}
            <span className="font-medium text-foreground">
              {currentTime}
            </span>
          </p>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4 md:p-5">
            {/* New request */}
            <div
              className={
                pendingRequest
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
            >
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">
                    Request a new schedule
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select the replacement date and time.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Date
                    </Label>

                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) =>
                        setNewDate(
                          e.target
                            .value,
                        )
                      }
                      className="
                        h-11 rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:h-9 md:text-sm
                      "
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Time
                    </Label>

                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) =>
                        setNewTime(
                          e.target
                            .value,
                        )
                      }
                      className="
                        h-11 rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:h-9 md:text-sm
                      "
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reason
                    </Label>

                    <Textarea
                      value={reason}
                      onChange={(e) =>
                        setReason(
                          e.target
                            .value,
                        )
                      }
                      placeholder="Why do you want to reschedule?"
                      className="
                        min-h-[90px]
                        rounded-md
                        text-base
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        md:text-sm
                      "
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pending warning */}
            {pendingRequest && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    <Clock className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Pending reschedule request
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                      {pendingRequest.requestedBy ===
                      'customer'
                        ? 'Customer'
                        : 'Staff'}{' '}
                      requested to move the
                      appointment to{' '}
                      {format(
                        new Date(
                          pendingRequest.newAppointmentDate,
                        ),
                        'MMM d, yyyy',
                      )}{' '}
                      at{' '}
                      {
                        pendingRequest.newAppointmentTime
                      }
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            {requests.length > 0 && (
              <div>
                <div className="mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Request History
                  </Label>
                </div>

                <div className="space-y-2">
                  {requests.map(
                    (req) => (
                      <div
                        key={req.id}
                        className="
                          rounded-xl
                          border border-border
                          bg-card p-3.5
                        "
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {req.requestedBy ===
                                'customer'
                                  ? 'Customer'
                                  : 'Staff'}
                              </span>

                              {getStatusBadge(
                                req.status,
                              )}
                            </div>

                            <p className="mt-2 text-sm font-medium text-foreground">
                              To{' '}
                              {format(
                                new Date(
                                  req.newAppointmentDate,
                                ),
                                'MMM d, yyyy',
                              )}{' '}
                              at{' '}
                              {
                                req.newAppointmentTime
                              }
                            </p>

                            {req.reason && (
                              <p className="mt-1 text-xs leading-5 italic text-muted-foreground">
                                Reason:{' '}
                                {req.reason}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {format(
                              new Date(
                                req.createdAt,
                              ),
                              'MMM d, h:mm a',
                            )}
                          </span>
                        </div>

                        {req.status ===
                          'PENDING' && (
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleApprove(
                                  req.id,
                                )
                              }
                              className="
                                h-10 rounded-md
                                bg-emerald-600
                                text-xs font-semibold text-white
                                hover:bg-emerald-700
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
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
                                handleReject(
                                  req.id,
                                )
                              }
                              className="
                                h-10 rounded-md
                                border-destructive/40
                                text-xs font-semibold
                                text-destructive
                                hover:bg-destructive/10
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-ring
                                focus-visible:ring-offset-2
                                md:h-9
                              "
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t border-border p-3 md:p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onOpenChange(false)
            }
            disabled={submitting}
            className="
              h-11 rounded-md px-4
              text-sm font-medium
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-9
            "
          >
            Close
          </Button>

          {!pendingRequest && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="
                h-11 rounded-md px-4
                text-sm font-semibold
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
              "
            >
              {submitting
                ? 'Submitting...'
                : 'Send Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}