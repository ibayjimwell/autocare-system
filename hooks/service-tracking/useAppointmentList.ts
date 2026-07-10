'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { toast } from 'sonner';
import { useRealtimeAppointment } from '@/connections/useRealtimeAppointment';
import type { SortField } from '@/app-utils/service-tracking/constants';

export function useAppointmentList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("CONFIRMED");

  // Search and sorting
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("customerName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const res = await appointmentsApi.list({ status: activeFilter });
      if (res.error) {
        toast.error(res.errorMessage || "Failed to load appointments.");
        setAppointments([]);
      } else {
        setAppointments(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Error loading appointments.");
      setAppointments([]);
    }
  }, [activeFilter]);

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
    if (appt.status === "CONFIRMED") {
      setPendingAppointment(appt);
      setConfirmDialogOpen(true);
    } else {
      setSelectedAppointment(appt);
    }
  };

  const handleConfirmStartInspection = async () => {
    if (!pendingAppointment) return;
    try {
      const res = await appointmentsApi.updateStatus(pendingAppointment.id, "UNDER_INSPECTION");
      if (res.error) {
        toast.error(res.errorMessage || "Failed to start inspection.");
      } else {
        toast.success("Inspection started!");
        setConfirmDialogOpen(false);
        setSelectedAppointment(pendingAppointment);
      }
    } catch (err: any) {
      toast.error(err.message || "Error starting inspection.");
    } finally {
      setPendingAppointment(null);
    }
  };

  const handleBack = () => {
    setSelectedAppointment(null);
  };

  // Client-side filtering and sorting
  const filteredAppointments = useMemo(() => {
    let data = [...appointments];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (appt) =>
          (appt.customer?.fullname || "").toLowerCase().includes(term) ||
          (appt.vehicle?.plateNumber || "").toLowerCase().includes(term) ||
          (appt.vehicle?.model || "").toLowerCase().includes(term) ||
          (appt.trackingNumber || "").toLowerCase().includes(term)
      );
    }
    data.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case "customerName":
          valA = (a.customer?.fullname || "").toLowerCase();
          valB = (b.customer?.fullname || "").toLowerCase();
          break;
        case "vehiclePlate":
          valA = (a.vehicle?.plateNumber || "").toLowerCase();
          valB = (b.vehicle?.plateNumber || "").toLowerCase();
          break;
        case "appointmentDate":
          valA = a.appointmentDate || "";
          valB = b.appointmentDate || "";
          break;
        case "appointmentTime":
          valA = a.appointmentTime || "";
          valB = b.appointmentTime || "";
          break;
        case "trackingNumber":
          valA = a.trackingNumber || "";
          valB = b.trackingNumber || "";
          break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
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
  };
}