'use client';

import React, { useEffect } from 'react';
import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceForm } from '@/hooks/services/useServiceForm';

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService?: any | null;
  onSuccess: () => void;
}

export default function ServiceFormModal({ open, onOpenChange, editingService, onSuccess }: ServiceFormModalProps) {
  const { form, setForm, saving, apiError, openCreate, openEdit, handleSave } = useServiceForm(onSuccess);

  useEffect(() => {
    if (open) {
      if (editingService) openEdit(editingService);
      else openCreate();
    }
  }, [open, editingService]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSave(); };

  return (
    <DataModal open={open} onOpenChange={onOpenChange} title={editingService ? "Edit Service Details" : "New Service Type"} onSubmit={onSubmit} isLoading={saving}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2 pb-2">
        {apiError && <ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} />}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Executive Oil Change" className="rounded-xl border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Type</Label>
          <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
            <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REPAIR">Repair</SelectItem>
              <SelectItem value="PMS">PMS</SelectItem>
              <SelectItem value="CHECKUP">Checkup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail the inclusions of this service..." className="rounded-xl border-slate-200 min-h-[100px] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Base Price (₱)</Label>
            <Input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="0.00" className="rounded-xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration (Mins)</Label>
            <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} placeholder="30" className="rounded-xl border-slate-200" />
          </div>
        </div>
      </div>
    </DataModal>
  );
}