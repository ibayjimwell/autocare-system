// components/customers/customer-form-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User, Mail, Phone, Copy, Eye, EyeOff, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerForm } from '@/hooks/customers/useCustomerForm';
import { toast } from 'sonner';

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: any | null;
  onSuccess: () => void;
}

export default function CustomerFormModal({
  open, onOpenChange, editingCustomer, onSuccess,
}: CustomerFormModalProps) {
  const {
    form, setForm, saving, formErrors, setFormErrors, apiError,
    openCreate, openEdit, handleSave,
    tempPassword, showTempDialog, setShowTempDialog,
  } = useCustomerForm(onSuccess);

  const [focusField, setFocusField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingCustomer) openEdit(editingCustomer);
      else openCreate();
    }
  }, [open, editingCustomer]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <>
      <DataModal
        open={open}
        onOpenChange={onOpenChange}
        title={editingCustomer ? 'Update Profile' : 'New Walk‑in Customer'}
        onSubmit={onSubmit}
        isLoading={saving}
      >
        <div className="space-y-6 pt-4 px-2">
          {apiError && <ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} />}

          {/* Full Name */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Full Name</Label>
            <div className="relative group">
              <User className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", focusField === "name" ? "text-primary" : "text-slate-400")} />
              <Input
                id="fullname"
                value={form.fullname}
                onFocus={() => setFocusField("name")}
                onBlur={() => setFocusField(null)}
                onChange={e => { setForm({ ...form, fullname: e.target.value }); if (formErrors.fullname) setFormErrors({ ...formErrors, fullname: undefined }); }}
                className={cn("pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white", formErrors.fullname && "border-destructive")}
                placeholder="Ex: John Smith"
              />
            </div>
            {formErrors.fullname && <p className="text-xs text-destructive">{formErrors.fullname}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Email Address</Label>
              <div className="relative group">
                <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", focusField === "email" ? "text-primary" : "text-slate-400")} />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  onChange={e => { setForm({ ...form, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: undefined }); }}
                  className={cn("pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white", formErrors.email && "border-destructive")}
                  placeholder="name@email.com"
                />
              </div>
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Phone Number</Label>
              <div className="relative group">
                <Phone className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", focusField === "phone" ? "text-primary" : "text-slate-400")} />
                <Input
                  id="phone"
                  value={form.phone}
                  onFocus={() => setFocusField("phone")}
                  onBlur={() => setFocusField(null)}
                  onChange={e => { setForm({ ...form, phone: e.target.value }); if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined }); }}
                  className={cn("pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white", formErrors.phone && "border-destructive")}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
            </div>
          </div>
        </div>
      </DataModal>

      {/* Temporary Password Dialog */}
      {showTempDialog && tempPassword && (
        <Dialog open={showTempDialog} onOpenChange={setShowTempDialog}>
          <DialogContent className="rounded-[2rem] sm:max-w-md border-none shadow-2xl">
            <DialogHeader className="items-center text-center">
              <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <DialogTitle className="text-xl font-black text-slate-800">Customer Registered</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                A temporary password has been generated for <strong>{form.fullname.trim()}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-900 p-6 rounded-[2rem] space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Temporary Password</p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-3xl font-mono font-black text-white tracking-tighter">{showTempDialog ? tempPassword : '••••••••'}</code>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white" onClick={() => setShowTempDialog(!showTempDialog)}>
                    {showTempDialog ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white" onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success('Password copied.'); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Please save this password. The customer can use it to log in and will be prompted to change it after first login.
              </p>
            </div>
            <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest" onClick={() => setShowTempDialog(false)}>Done</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}