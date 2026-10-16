'use client';

import { useState } from 'react';
import { servicesApi, type ServicePayload } from '@/lib/services/services';
import { toast } from 'sonner';
import { REPAIR_SUBCATEGORIES } from '@/app-utils/services/helpers';

const EMPTY = { name: '', description: '', basePrice: '', durationMinutes: '', type: 'REPAIR' as const, subcategory: '', isLaborInclude: false };
type Form = Omit<typeof EMPTY, 'type'> & { type: ServicePayload['type'] };

export function useServiceForm(onSuccess: () => void) {
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [editingService, setEditingService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<any>(null);

  const openCreate = () => { setEditingService(null); setForm({ ...EMPTY }); setApiError(null); };
  const openEdit = (service: any) => {
    setEditingService(service);
    setForm({
      name: service.name || '', description: service.description || '',
      basePrice: service.basePrice?.toString() || '',
      durationMinutes: String(service.durationMinutes ?? service.estimatedDuration ?? ''),
      type: ['PMS', 'REPAIR', 'DIAGNOSTIC'].includes(service.type) ? service.type : 'REPAIR',
      subcategory: service.subcategory || '',
      isLaborInclude: service.isLaborInclude === true,
    });
    setApiError(null);
  };
  const handleSave = async () => {
    if (saving) return;
    setApiError(null);
    if (form.type === 'REPAIR' && !REPAIR_SUBCATEGORIES.includes(form.subcategory as any)) {
      setApiError({ type: 'fve', title: 'Repair subcategory required', message: 'Select a REPAIR subcategory.' });
      return;
    }
    if (!Number.isInteger(Number(form.durationMinutes)) || Number(form.durationMinutes) < 1) {
      setApiError({ type: 'fve', title: 'Duration required', message: 'Enter a service duration of at least 1 minute using Hours and Minutes.' });
      return;
    }
    setSaving(true);
    try {
      const payload: ServicePayload = {
        name: form.name.trim(), description: form.description.trim(),
        basePrice: form.basePrice.trim() === '' ? null : Number(form.basePrice),
        durationMinutes: Number(form.durationMinutes), type: form.type,
        subcategory: form.type === 'REPAIR' ? form.subcategory : null,
        isLaborInclude: form.isLaborInclude,
      };
      const res = editingService ? await servicesApi.update(editingService.id, payload) : await servicesApi.create(payload);
      if (res.error) {
        setApiError({ type: res.errorType || 'fve', title: res.errorTitle || 'Error', message: res.errorMessage || 'Operation failed.' });
      } else {
        toast.success(editingService ? 'Service updated.' : 'Service created.');
        onSuccess();
      }
    } catch (err: any) {
      setApiError({ type: 'se', title: 'Unexpected Error', message: err?.message || 'Something went wrong.' });
    } finally { setSaving(false); }
  };
  return { form, setForm, editingService, saving, apiError, openCreate, openEdit, handleSave };
}
