'use client';

import { useState } from 'react';
import { servicesApi } from '@/lib/services/services';
import { toast } from 'sonner';

export function useServiceForm(onSuccess: () => void) {
  const [form, setForm] = useState({ name: '', description: '', basePrice: '', durationMinutes: '', type: 'REPAIR' });
  const [editingService, setEditingService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<any>(null);

  const openCreate = () => {
    setEditingService(null);
    setForm({ name: '', description: '', basePrice: '', durationMinutes: '', type: 'REPAIR' });
    setApiError(null);
  };

  const openEdit = (service: any) => {
    setEditingService(service);
    setForm({
      name: service.name || '',
      description: service.description || '',
      basePrice: service.basePrice?.toString() || '',
      durationMinutes: service.durationMinutes?.toString() || '',
      type: service.type || 'REPAIR',
    });
    setApiError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setApiError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
        durationMinutes: parseInt(form.durationMinutes, 10),
        type: form.type,
      };
      const res = editingService
        ? await servicesApi.update(editingService.id, payload)
        : await servicesApi.create(payload);
      if (res.error) {
        setApiError({ type: res.errorType || "fve", title: res.errorTitle || "Error", message: res.errorMessage || "Operation failed." });
      } else {
        toast.success(editingService ? "Service updated." : "Service created.");
        onSuccess();
      }
    } catch (err: any) {
      setApiError({ type: "se", title: "Unexpected Error", message: err.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return { form, setForm, editingService, saving, apiError, openCreate, openEdit, handleSave };
}