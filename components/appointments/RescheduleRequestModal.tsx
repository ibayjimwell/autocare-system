'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface RescheduleRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  onSuccess: () => void;
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

  const handleSubmit = async () => {
    if (!newDate || !newTime) {
      toast.error('Please select a new date and time.');
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
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error('Error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Request Reschedule</DialogTitle>
          <p className="text-sm text-muted-foreground">Current: {currentDate} at {currentTime}</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold">
            {submitting ? 'Submitting...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}