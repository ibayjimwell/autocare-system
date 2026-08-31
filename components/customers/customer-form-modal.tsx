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
        <div className="space-y-5 px-1 pt-2">
          {apiError && <ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} />}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullname" className="text-sm font-medium text-foreground">Full Name</Label>
            <div className="relative">
              <User className={cn(
                "absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4",
                focusField === "name" ? "text-primary" : "text-muted-foreground",
              )} />
              <Input
                id="fullname"
                value={form.fullname}
                onFocus={() => setFocusField("name")}
                onBlur={() => setFocusField(null)}
                onChange={e => { setForm({ ...form, fullname: e.target.value }); if (formErrors.fullname) setFormErrors({ ...formErrors, fullname: undefined }); }}
                className={cn("h-11 rounded-md bg-background pl-11 text-base md:h-9 md:pl-10 md:text-sm", formErrors.fullname && "border-destructive")}
                placeholder="Ex: John Smith"
              />
            </div>
            {formErrors.fullname && <p className="text-xs font-medium text-destructive">{formErrors.fullname}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className={cn(
                  "absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4",
                  focusField === "email" ? "text-primary" : "text-muted-foreground",
                )} />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  onChange={e => { setForm({ ...form, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: undefined }); }}
                  className={cn("h-11 rounded-md bg-background pl-11 text-base md:h-9 md:pl-10 md:text-sm", formErrors.email && "border-destructive")}
                  placeholder="name@email.com"
                />
              </div>
              {formErrors.email && <p className="text-xs font-medium text-destructive">{formErrors.email}</p>}
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
              <div className="relative">
                <Phone className={cn(
                  "absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4",
                  focusField === "phone" ? "text-primary" : "text-muted-foreground",
                )} />
                <Input
                  id="phone"
                  value={form.phone}
                  onFocus={() => setFocusField("phone")}
                  onBlur={() => setFocusField(null)}
                  onChange={e => { setForm({ ...form, phone: e.target.value }); if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined }); }}
                  className={cn("h-11 rounded-md bg-background pl-11 text-base md:h-9 md:pl-10 md:text-sm", formErrors.phone && "border-destructive")}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              {formErrors.phone && <p className="text-xs font-medium text-destructive">{formErrors.phone}</p>}
            </div>
          </div>
        </div>
      </DataModal>

      {/* Temporary Password Dialog */}
      {showTempDialog && tempPassword && (
        <Dialog open={showTempDialog} onOpenChange={setShowTempDialog}>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader className="items-center text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">Customer Registered</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                A temporary password has been generated for <strong className="text-foreground">{form.fullname.trim()}</strong>.
              </DialogDescription>
            </DialogHeader>

            {/* Inverted token panel — dark in light mode, light in dark mode */}
            <div className="relative space-y-3 overflow-hidden rounded-lg bg-foreground p-4 text-background md:p-6">
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-background/60">Temporary Password</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <code className="break-all font-mono text-xl font-semibold tracking-tight md:text-2xl">
                  {showTempDialog ? tempPassword : '••••••••'}
                </code>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={showTempDialog ? "Hide password" : "Show password"}
                    className="h-10 w-10 rounded-md text-background/60 hover:bg-background/10 hover:text-background"
                    onClick={() => setShowTempDialog(!showTempDialog)}
                  >
                    {showTempDialog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy password"
                    className="h-10 w-10 rounded-md text-background/60 hover:bg-background/10 hover:text-background"
                    onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success('Password copied.'); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Please save this password. The customer can use it to log in and will be prompted to change it after first login.
              </p>
            </div>

            <Button className="h-11 w-full rounded-md font-medium md:h-9" onClick={() => setShowTempDialog(false)}>Done</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}