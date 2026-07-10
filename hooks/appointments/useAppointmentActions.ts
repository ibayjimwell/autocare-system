// hooks/appointments/useAppointmentActions.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { appointmentsApi } from '@/lib/appointments/appointments';

export function useAppointmentActions() {
  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    appointment: any | null;
    reason: string;
  }>({ open: false, appointment: null, reason: '' });

  const handleConfirm = useCallback(async (appt: any) => {
    try {
      const res = await appointmentsApi.updateStatus(appt.id, 'CONFIRMED');
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to confirm.');
      } else {
        toast.success('Appointment confirmed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error confirming.');
    }
  }, []);

  const handleDecline = useCallback(async () => {
    const { appointment, reason } = declineModal;
    if (!appointment || !reason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    try {
      const res = await appointmentsApi.updateStatus(appointment.id, 'CANCELLED', reason.trim());
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to decline.');
      } else {
        toast.success('Appointment declined.');
        setDeclineModal({ open: false, appointment: null, reason: '' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error declining.');
    }
  }, [declineModal]);

  return {
    declineModal,
    setDeclineModal,
    handleConfirm,
    handleDecline,
  };
}