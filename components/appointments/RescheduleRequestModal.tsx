'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface RescheduleRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  onSuccess: () => void;
}

interface Request {
  id: string;
  appointmentId: string;
  requestedBy: 'customer' | 'staff';
  requestedByCustomerId?: string;
  requestedByStaffId?: string;
  newAppointmentDate: string;
  newAppointmentTime: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
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
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(currentTime);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<Request | null>(null);

  const loadRequests = async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule-request`);
      const json = await res.json();
      if (!json.error) {
        setRequests(json.data || []);
        const pending = json.data?.find((r: any) => r.status === 'PENDING');
        setPendingRequest(pending || null);
      }
    } catch (err) {
      console.error('Failed to load reschedule requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [open, appointmentId]);

  const handleSubmit = async () => {
    if (!newDate || !newTime) {
      toast.error('Please select a new date and time.');
      return;
    }

    if (pendingRequest) {
      toast.error('A pending reschedule request already exists.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reschedule-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAppointmentDate: newDate, newAppointmentTime: newTime, reason }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.errorMessage || 'Failed to request reschedule.');
      } else {
        toast.success('Reschedule request sent.');
        await loadRequests();
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('Error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/reschedule-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.errorMessage || 'Failed to approve.');
      } else {
        toast.success('Appointment rescheduled successfully.');
        await loadRequests();
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('Error approving request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (requestId: string) => {
    const rejectionReason = prompt('Please provide a reason for rejecting:');
    if (rejectionReason === null) return; // cancelled
    if (!rejectionReason.trim()) {
      toast.error('A reason is required for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/reschedule-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.errorMessage || 'Failed to reject.');
      } else {
        toast.success('Reschedule request rejected.');
        await loadRequests();
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('Error rejecting request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', label: 'Pending' },
      APPROVED: { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', label: 'Approved' },
      REJECTED: { color: 'bg-destructive/15 text-destructive', label: 'Rejected' },
      CANCELLED: { color: 'bg-muted text-muted-foreground', label: 'Cancelled' },
    };
    const { color, label } = config[status as keyof typeof config] || config.PENDING;
    return <Badge variant="outline" className={cn('border-transparent font-medium', color)}>{label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none p-4 sm:max-w-lg sm:rounded-xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">Reschedule Request</DialogTitle>
          <p className="text-sm text-muted-foreground">Current: {currentDate} at {currentTime}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New Request Form – disabled if there's a pending request */}
          <div className={pendingRequest ? 'pointer-events-none opacity-50' : ''}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-11 rounded-md text-base md:h-9 md:text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Time</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-11 rounded-md text-base md:h-9 md:text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want to reschedule?" className="rounded-md text-base md:text-sm" />
              </div>
            </div>
          </div>

          {pendingRequest && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                <Clock className="h-4 w-4" />
                A pending reschedule request exists.
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {pendingRequest.requestedBy === 'customer' ? 'Customer' : 'Staff'} requested to move to {format(new Date(pendingRequest.newAppointmentDate), 'MMM d, yyyy')} at {pendingRequest.newAppointmentTime}.
              </p>
            </div>
          )}

          {/* History of requests */}
          {requests.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</Label>
              <ScrollArea className="mt-2 max-h-60">
                <div className="space-y-2">
                  {requests.map((req) => (
                    <div key={req.id} className="space-y-1.5 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {req.requestedBy === 'customer' ? 'Customer' : 'Staff'}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(req.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        To {format(new Date(req.newAppointmentDate), 'MMM d, yyyy')} at {req.newAppointmentTime}
                      </p>
                      {req.reason && <p className="text-xs italic text-muted-foreground">Reason: {req.reason}</p>}

                      {/* ✅ Show Approve/Reject for ALL pending requests (staff can act on any) */}
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            className="h-9 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            className="h-9 rounded-md border-destructive/40 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="h-11 rounded-md px-4 text-sm font-medium md:h-9">Close</Button>
          {!pendingRequest && (
            <Button onClick={handleSubmit} disabled={submitting} className="h-11 rounded-md px-4 text-sm font-semibold md:h-9">
              {submitting ? 'Submitting...' : 'Send Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}