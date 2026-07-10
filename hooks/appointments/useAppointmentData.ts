// hooks/appointments/useAppointmentData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { customersApi } from '@/lib/customers/customers';
import { servicesApi } from '@/lib/services/services';
import { staffApi } from '@/lib/staffs/staffs';
import { useRealtimeAppointment } from '@/connections/useRealtimeAppointment';

export function useAppointmentData() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [apiError, setApiError] = useState<any>(null);

  const loadAppointments = useCallback(async () => {
    setApiError(null);
    try {
      const res = await appointmentsApi.list();
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load appointments.",
        });
        setAppointments([]);
      } else {
        setAppointments(res.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    }
  }, []);

  const loadDependencies = useCallback(async () => {
    try {
      const [custRes, svcRes, staffRes] = await Promise.all([
        customersApi.list(),
        servicesApi.list(true),
        staffApi.list(),
      ]);
      setCustomers(custRes.error ? [] : (custRes.data || []));
      setServices(svcRes.error ? [] : (svcRes.data || []));
      setStaffList(staffRes.error ? [] : (staffRes.data || []));
    } catch (err) {
      console.error("Failed to load dependencies:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await Promise.all([loadAppointments(), loadDependencies()]);
      setInitialLoading(false);
    };
    init();
  }, []); // eslint-disable-line

  // Realtime subscription
  const handleRealtimeRefresh = useCallback(() => {
    loadAppointments();
  }, [loadAppointments]);

  useRealtimeAppointment({ onDataChanged: handleRealtimeRefresh });

  return {
    appointments,
    initialLoading,
    customers,
    services,
    staffList,
    apiError,
    setApiError,
    loadAppointments,
  };
}