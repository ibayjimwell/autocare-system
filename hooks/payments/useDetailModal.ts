// hooks/payments/useDetailModal.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { estimatesApi } from '@/lib/payments/estimates';
import { finalBillsApi } from '@/lib/payments/final-bills';
import { appointmentsApi } from '@/lib/appointments/appointments';

export function useDetailModal(onSuccess?: () => void) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'estimate' | 'final-bill'>('estimate');
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (item: any, type: 'estimate' | 'final-bill') => {
    setDetailLoading(true);
    setSelectedItem(item);
    setDetailType(type);
    setDetailModalOpen(true);

    if (type === 'final-bill') {
      try {
        const [billRes, apptRes] = await Promise.all([
          finalBillsApi.get(item.id),
          appointmentsApi.get(item.appointmentId),
        ]);
        if (billRes.error || !billRes.data) {
          toast.error(billRes.errorMessage || 'Could not load full bill details.');
          setDetailLoading(false);
          return;
        }
        const bill = billRes.data;
        if (!apptRes.error && apptRes.data) {
          bill.appointment = {
            ...bill.appointment,
            customer: apptRes.data.customer,
            vehicle: apptRes.data.vehicle,
            services: apptRes.data.services || [],
          };
        }
        setSelectedItem(bill);
      } catch (err) {
        console.error('Failed to fetch final bill details', err);
        toast.error('Error loading bill details.');
      }
    } else {
      try {
        const [estRes, apptRes] = await Promise.all([
          estimatesApi.get(item.id),
          appointmentsApi.get(item.appointmentId),
        ]);
        if (!estRes.error) {
          const data = estRes.data;
          if (!apptRes.error && apptRes.data) {
            data.appointment.services = apptRes.data.services || [];
          }
          setSelectedItem(data);
        }
      } catch (err) {
        console.error('Failed to refresh estimate details', err);
      }
    }
    setDetailLoading(false);
    onSuccess?.();
  }, [onSuccess]);

  const refreshDetail = useCallback(async () => {
    if (detailType === 'estimate' && selectedItem) {
      const res = await estimatesApi.get(selectedItem.id);
      if (!res.error) setSelectedItem(res.data);
    } else if (detailType === 'final-bill' && selectedItem) {
      const res = await finalBillsApi.get(selectedItem.id);
      if (!res.error) setSelectedItem(res.data);
    }
  }, [detailType, selectedItem]);

  return {
    detailModalOpen,
    setDetailModalOpen,
    selectedItem,
    setSelectedItem,
    detailType,
    detailLoading,
    openDetail,
    refreshDetail,
  };
}