// hooks/service-tracking/useAppointmentList.ts
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { toast } from 'sonner';
import { useRealtimeAppointment } from '@/connections/useRealtimeAppointment';
import type { SortField } from '@/app-utils/service-tracking/constants';

function todayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useAppointmentList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [futureAppointments, setFutureAppointments] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('CONFIRMED');

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('customerName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);
  const [futureDrawerOpen, setFutureDrawerOpen] = useState(false);

  // Main list load – for statuses other than CONFIRMED, fetch all. For CONFIRMED, fetch today's only.
  const loadAppointments = useCallback(async () => {
    try {
      let params: any = { status: activeFilter };
      if (activeFilter === 'CONFIRMED') {
        params.from = todayString();
        params.to = todayString();
      }
      const res = await appointmentsApi.list(params);
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load appointments.');
        setAppointments([]);
      } else {
        setAppointments(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading appointments.');
      setAppointments([]);
    }
  }, [activeFilter]);

  // Load future confirmed appointments (date > today)
  const loadFutureAppointments = useCallback(async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const from = tomorrow.toISOString().slice(0, 10);
      const res = await appointmentsApi.list({ status: 'CONFIRMED', from });
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to load future appointments.');
        setFutureAppointments([]);
      } else {
        // Sort by date & time ascending
        const sorted = (res.data || []).sort((a: any, b: any) => {
          const dateA = a.appointmentDate + ' ' + (a.appointmentTime || '00:00');
          const dateB = b.appointmentDate + ' ' + (b.appointmentTime || '00:00');
          return dateA.localeCompare(dateB);
        });
        setFutureAppointments(sorted);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading future appointments.');
      setFutureAppointments([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await loadAppointments();
      setInitialLoading(false);
    };
    init();
  }, []); // eslint-disable-line

  // Re-fetch when filter changes (skip initial mount)
  const isFirstFilterChange = useRef(true);
  useEffect(() => {
    if (isFirstFilterChange.current) {
      isFirstFilterChange.current = false;
      return;
    }
    loadAppointments();
  }, [activeFilter, loadAppointments]);

  // Realtime subscription
  const handleRealtimeRefresh = useCallback(() => {
    loadAppointments();
  }, [loadAppointments]);

  useRealtimeAppointment({ onDataChanged: handleRealtimeRefresh });

  const handleInspect = (appt: any) => {
    if (appt.status === 'CONFIRMED') {
      setPendingAppointment(appt);
      setConfirmDialogOpen(true);
    } else {
      setSelectedAppointment(appt);
    }
  };

  const handleConfirmStartInspection = async () => {
    if (!pendingAppointment) return;
    try {
      const res = await appointmentsApi.updateStatus(pendingAppointment.id, 'UNDER_INSPECTION');
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to start inspection.');
      } else {
        toast.success('Inspection started!');
        setConfirmDialogOpen(false);
        setSelectedAppointment(pendingAppointment);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error starting inspection.');
    } finally {
      setPendingAppointment(null);
    }
  };

  const handleBack = () => {
    setSelectedAppointment(null);
  };

  // Client-side filtering and sorting (unchanged)
  const filteredAppointments = useMemo(() => {
    let data = [...appointments];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (appt) =>
          (appt.customer?.fullname || '').toLowerCase().includes(term) ||
          (appt.vehicle?.plateNumber || '').toLowerCase().includes(term) ||
          (appt.vehicle?.model || '').toLowerCase().includes(term) ||
          (appt.trackingNumber || '').toLowerCase().includes(term)
      );
    }
    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'customerName':
          valA = (a.customer?.fullname || '').toLowerCase();
          valB = (b.customer?.fullname || '').toLowerCase();
          break;
        case 'vehiclePlate':
          valA = (a.vehicle?.plateNumber || '').toLowerCase();
          valB = (b.vehicle?.plateNumber || '').toLowerCase();
          break;
        case 'appointmentDate':
          valA = a.appointmentDate || '';
          valB = b.appointmentDate || '';
          break;
        case 'appointmentTime':
          valA = a.appointmentTime || '';
          valB = b.appointmentTime || '';
          break;
        case 'trackingNumber':
          valA = a.trackingNumber || '';
          valB = b.trackingNumber || '';
          break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [appointments, search, sortField, sortDirection]);

  return {
    initialLoading,
    selectedAppointment,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAppointment,
    handleInspect,
    handleConfirmStartInspection,
    handleBack,
    filteredAppointments,
    loadAppointments,
    // New for future appointments
    futureAppointments,
    loadFutureAppointments,
    futureDrawerOpen,
    setFutureDrawerOpen,
  };
}