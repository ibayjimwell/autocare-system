'use client';

import { useState, useEffect, useCallback } from 'react';
import { servicesApi } from '@/lib/services/services';
import { toast } from 'sonner';

export function useServiceData() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<any>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await servicesApi.list();
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load services.",
        });
        setServices([]);
      } else {
        const mapped = (res.data || []).map((item: any) => ({
          ...item,
          durationMinutes: item.estimatedDuration,
        }));
        setServices(mapped);
      }
    } catch (err: any) {
      setApiError({ type: "se", title: "Unexpected Error", message: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  const disableService = async (id: string, name: string) => {
    const res = await servicesApi.disable(id);
    if (res.error) { toast.error(res.errorMessage || "Failed to disable service."); return false; }
    toast.success(`"${name}" has been disabled.`);
    await loadServices();
    return true;
  };

  const enableService = async (id: string, name: string) => {
    const res = await servicesApi.enable(id);
    if (res.error) { toast.error(res.errorMessage || "Failed to enable service."); return false; }
    toast.success(`"${name}" has been enabled.`);
    await loadServices();
    return true;
  };

  return { services, loading, apiError, loadServices, disableService, enableService };
}