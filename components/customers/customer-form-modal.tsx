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
  User,
  Mail,
  Phone,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
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
  open,
  onOpenChange,
  editingCustomer,
  onSuccess,
}: CustomerFormModalProps) {
  const {
    form,
    setForm,
    saving,
    formErrors,
    setFormErrors,
    apiError,
    openCreate,
    openEdit,
    handleSave,
    tempPassword,
    showTempDialog,
    setShowTempDialog,
  } = useCustomerForm(onSuccess);

  const [focusField, setFocusField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingCustomer) {
        openEdit(editingCustomer);
      } else {
        openCreate();
      }
    }
  }, [open, editingCustomer]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const fieldClass = (hasError?: boolean, focused?: boolean) =>
    cn(
      `
      h-11 rounded-md bg-background
      text-base
      shadow-none
      transition-colors
      focus-visible:ring-2
      focus-visible:ring-ring
      focus-visible:ring-offset-1
      md:h-9 md:text-sm
      `,
      focused && 'border-primary/60',
      hasError && 'border-destructive'
    );

  return (
    <>
      <DataModal
        open={open}
        onOpenChange={onOpenChange}
        title={
          editingCustomer
            ? 'Update Customer Profile'
            : 'New Walk-in Customer'
        }
        onSubmit={onSubmit}
        isLoading={saving}
      >
        <div className="space-y-5 px-1 pt-1">
          {apiError && (
            <ErrorHandler
              type={apiError.type}
              title={apiError.title}
              message={apiError.message}
            />
          )}

          {/* Intro */}
          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <p className="text-sm font-medium text-foreground">
              {editingCustomer
                ? 'Update customer information'
                : 'Create a customer profile'}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Keep customer contact information accurate for appointments,
              notifications, and service records.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label
              htmlFor="fullname"
              className="text-sm font-medium text-foreground"
            >
              Full Name
            </Label>

            <div className="relative">
              <User
                className={cn(
                  'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4',
                  focusField === 'name'
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              />

              <Input
                id="fullname"
                value={form.fullname}
                onFocus={() => setFocusField('name')}
                onBlur={() => setFocusField(null)}
                onChange={(e) => {
                  setForm({
                    ...form,
                    fullname: e.target.value,
                  });

                  if (formErrors.fullname) {
                    setFormErrors({
                      ...formErrors,
                      fullname: undefined,
                    });
                  }
                }}
                className={cn(
                  fieldClass(
                    Boolean(formErrors.fullname),
                    focusField === 'name'
                  ),
                  'pl-11 md:pl-10'
                )}
                placeholder="Ex: John Smith"
              />
            </div>

            {formErrors.fullname && (
              <p className="text-xs font-medium text-destructive">
                {formErrors.fullname}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address
              </Label>

              <div className="relative">
                <Mail
                  className={cn(
                    'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4',
                    focusField === 'email'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />

                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField(null)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      email: e.target.value,
                    });

                    if (formErrors.email) {
                      setFormErrors({
                        ...formErrors,
                        email: undefined,
                      });
                    }
                  }}
                  className={cn(
                    fieldClass(
                      Boolean(formErrors.email),
                      focusField === 'email'
                    ),
                    'pl-11 md:pl-10'
                  )}
                  placeholder="name@email.com"
                />
              </div>

              {formErrors.email && (
                <p className="text-xs font-medium text-destructive">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Phone Number
              </Label>

              <div className="relative">
                <Phone
                  className={cn(
                    'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4',
                    focusField === 'phone'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />

                <Input
                  id="phone"
                  value={form.phone}
                  onFocus={() => setFocusField('phone')}
                  onBlur={() => setFocusField(null)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      phone: e.target.value,
                    });

                    if (formErrors.phone) {
                      setFormErrors({
                        ...formErrors,
                        phone: undefined,
                      });
                    }
                  }}
                  className={cn(
                    fieldClass(
                      Boolean(formErrors.phone),
                      focusField === 'phone'
                    ),
                    'pl-11 md:pl-10'
                  )}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>

              {formErrors.phone && (
                <p className="text-xs font-medium text-destructive">
                  {formErrors.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </DataModal>

      {/* Temporary Password Dialog */}
      {showTempDialog && tempPassword && (
        <Dialog
          open={showTempDialog}
          onOpenChange={setShowTempDialog}
        >
          <DialogContent
            className="
              rounded-xl p-5 shadow-xl
              sm:max-w-md md:p-6
            "
          >
            <DialogHeader className="items-center text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>

              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Customer Registered
              </DialogTitle>

              <DialogDescription className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                A temporary password has been generated for{' '}
                <strong className="text-foreground">
                  {form.fullname.trim()}
                </strong>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Password */}
              <div className="relative overflow-hidden rounded-lg bg-foreground p-4 text-background md:p-5">
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55">
                  Temporary password
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <code className="break-all text-center font-mono text-xl font-semibold tracking-tight md:text-2xl">
                    {showTempDialog ? tempPassword : '••••••••'}
                  </code>

                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        showTempDialog
                          ? 'Hide password'
                          : 'Show password'
                      }
                      className="
                        h-10 w-10 rounded-md
                        text-background/60
                        hover:bg-background/10 hover:text-background
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-foreground
                      "
                      onClick={() =>
                        setShowTempDialog(!showTempDialog)
                      }
                    >
                      {showTempDialog ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Copy password"
                      className="
                        h-10 w-10 rounded-md
                        text-background/60
                        hover:bg-background/10 hover:text-background
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-foreground
                      "
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        toast.success('Password copied.');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reminder */}
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Please save this password. The customer can use it to
                  log in and will be prompted to change it after first
                  login.
                </p>
              </div>

              <Button
                type="button"
                className="
                  h-11 w-full rounded-md font-medium
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-9
                "
                onClick={() => setShowTempDialog(false)}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}