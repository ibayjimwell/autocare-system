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
      PENDING: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      CANCELLED: { color: 'bg-slate-100 text-slate-700', label: 'Cancelled' },
    };
    const { color, label } = config[status as keyof typeof config] || config.PENDING;
    return <Badge className={`${color} border-none`}>{label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black">Reschedule Request</DialogTitle>
          <p className="text-sm text-muted-foreground">Current: {currentDate} at {currentTime}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New Request Form – disabled if there's a pending request */}
          <div className={pendingRequest ? 'opacity-50 pointer-events-none' : ''}>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Time</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want to reschedule?" className="rounded-xl" />
            </div>
          </div>

          {pendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                A pending reschedule request exists.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {pendingRequest.requestedBy === 'customer' ? 'Customer' : 'Staff'} requested to move to {format(new Date(pendingRequest.newAppointmentDate), 'MMM d, yyyy')} at {pendingRequest.newAppointmentTime}.
              </p>
            </div>
          )}

          {/* History of requests */}
          {requests.length > 0 && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">History</Label>
              <ScrollArea className="max-h-60 mt-2">
                <div className="space-y-2">
                  {requests.map((req) => (
                    <div key={req.id} className="border rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">
                            {req.requestedBy === 'customer' ? 'Customer' : 'Staff'}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(req.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">
                        To {format(new Date(req.newAppointmentDate), 'MMM d, yyyy')} at {req.newAppointmentTime}
                      </p>
                      {req.reason && <p className="text-xs text-muted-foreground italic">Reason: {req.reason}</p>}
                      
                      {/* ✅ Show Approve/Reject for ALL pending requests (staff can act on any) */}
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            className="text-xs font-bold border-red-300 text-red-600 hover:bg-red-50"
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Close</Button>
          {!pendingRequest && (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold">
              {submitting ? 'Submitting...' : 'Send Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}