'use client';

import React, {
  useState,
  useEffect,
} from 'react';

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

import {
  useCustomerForm,
} from '@/hooks/customers/useCustomerForm';

import { toast } from 'sonner';

import {
  normalizePhilippinePhone,
} from '@/utils/phone';

interface CustomerFormModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean
  ) => void;

  editingCustomer?:
    | any
    | null;

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
  } = useCustomerForm(
    onSuccess
  );

  const [
    focusField,
    setFocusField,
  ] = useState<
    string | null
  >(null);

  /*
   * IMPORTANT:
   *
   * This state is ONLY for showing/hiding
   * the temporary password.
   *
   * Do NOT use showTempDialog for this.
   *
   * showTempDialog controls whether the
   * Dialog itself is open.
   */
  const [
    showTempPassword,
    setShowTempPassword,
  ] = useState(true);

  /*
   * Used to give the user feedback after
   * successfully copying the password.
   */
  const [
    passwordCopied,
    setPasswordCopied,
  ] = useState(false);

  // ---------------------------------------------------------------
  // Initialize form when modal opens
  // ---------------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingCustomer) {
      openEdit(
        editingCustomer
      );
    } else {
      openCreate();
    }
  }, [
    open,
    editingCustomer,
  ]);

  // ---------------------------------------------------------------
  // Reset temporary-password UI state whenever
  // the temporary password dialog opens.
  // ---------------------------------------------------------------

  useEffect(() => {
    if (showTempDialog) {
      /*
       * Preserve the current behavior:
       * show the generated password by default.
       */
      setShowTempPassword(
        true
      );

      setPasswordCopied(
        false
      );
    }
  }, [
    showTempDialog,
  ]);

  // ---------------------------------------------------------------
  // Submit form
  // ---------------------------------------------------------------

  const onSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    handleSave();
  };

  // ---------------------------------------------------------------
  // Normalize phone when leaving phone field
  // ---------------------------------------------------------------

  const handlePhoneBlur =
    () => {
      const normalized =
        normalizePhilippinePhone(
          form.phone
        );

      if (normalized) {
        setForm({
          ...form,
          phone:
            normalized,
        });
      }

      setFocusField(
        null
      );
    };

  // ---------------------------------------------------------------
  // Copy temporary password
  //
  // Modern Clipboard API is preferred.
  // Fallback is provided for browsers/environments
  // where navigator.clipboard is unavailable.
  // ---------------------------------------------------------------

  const handleCopyPassword =
    async () => {
      if (
        !tempPassword
      ) {
        toast.error(
          'No temporary password available.'
        );

        return;
      }

      const text =
        tempPassword;

      try {
        /*
         * Preferred modern Clipboard API.
         */
        if (
          navigator.clipboard &&
          typeof navigator
            .clipboard.writeText ===
            'function'
        ) {
          await navigator.clipboard.writeText(
            text
          );

          setPasswordCopied(
            true
          );

          toast.success(
            'Password copied to clipboard.'
          );

          /*
           * Reset visual "Copied" state
           * after a short period.
           */
          window.setTimeout(
            () => {
              setPasswordCopied(
                false
              );
            },
            2000
          );

          return;
        }

        /*
         * Fallback for environments where
         * navigator.clipboard is unavailable.
         */
        const textarea =
          document.createElement(
            'textarea'
          );

        textarea.value =
          text;

        textarea.setAttribute(
          'readonly',
          ''
        );

        /*
         * Keep the temporary textarea
         * invisible and out of the layout.
         */
        textarea.style.position =
          'fixed';

        textarea.style.top =
          '0';

        textarea.style.left =
          '0';

        textarea.style.width =
          '1px';

        textarea.style.height =
          '1px';

        textarea.style.padding =
          '0';

        textarea.style.border =
          '0';

        textarea.style.outline =
          '0';

        textarea.style.boxShadow =
          'none';

        textarea.style.background =
          'transparent';

        textarea.style.opacity =
          '0';

        document.body.appendChild(
          textarea
        );

        textarea.focus();

        textarea.select();

        /*
         * execCommand is a fallback for
         * older/incompatible environments.
         */
        const successful =
          document.execCommand(
            'copy'
          );

        document.body.removeChild(
          textarea
        );

        if (!successful) {
          throw new Error(
            'Clipboard copy command failed.'
          );
        }

        setPasswordCopied(
          true
        );

        toast.success(
          'Password copied to clipboard.'
        );

        window.setTimeout(
          () => {
            setPasswordCopied(
              false
            );
          },
          2000
        );
      } catch (
        error
      ) {
        console.error(
          '[CustomerFormModal] Failed to copy password:',
          error
        );

        setPasswordCopied(
          false
        );

        toast.error(
          'Could not copy password. Please copy it manually.'
        );
      }
    };

  // ---------------------------------------------------------------
  // Field styling
  // ---------------------------------------------------------------

  const fieldClass = (
    hasError?: boolean,
    focused?: boolean
  ) =>
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

      focused &&
        'border-primary/60',

      hasError &&
        'border-destructive'
    );

  return (
    <>
      {/* ========================================================= */}
      {/* CUSTOMER FORM MODAL                                      */}
      {/* ========================================================= */}

      <DataModal
        open={open}
        onOpenChange={
          onOpenChange
        }
        title={
          editingCustomer
            ? 'Update Customer Profile'
            : 'New Walk-in Customer'
        }
        onSubmit={
          onSubmit
        }
        isLoading={
          saving
        }
      >
        <div className="space-y-5 px-1 pt-1">

          {/* ===================================================== */}
          {/* API ERROR                                            */}
          {/* ===================================================== */}

          {apiError && (
            <ErrorHandler
              type={
                apiError.type
              }
              title={
                apiError.title
              }
              message={
                apiError.message
              }
            />
          )}

          {/* ===================================================== */}
          {/* INTRO                                                 */}
          {/* ===================================================== */}

          <div className="rounded-lg border border-border bg-muted/30 p-3.5">

            <p className="text-sm font-medium text-foreground">
              {editingCustomer
                ? 'Update customer information'
                : 'Create a customer profile'}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Keep customer contact information accurate
              for appointments, notifications, and service
              records.
            </p>

          </div>

          {/* ===================================================== */}
          {/* FULL NAME                                             */}
          {/* ===================================================== */}

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

                  focusField ===
                    'name'
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              />

              <Input
                id="fullname"
                value={
                  form.fullname
                }
                onFocus={() =>
                  setFocusField(
                    'name'
                  )
                }
                onBlur={() =>
                  setFocusField(
                    null
                  )
                }
                onChange={(e) => {
                  setForm({
                    ...form,

                    fullname:
                      e.target
                        .value,
                  });

                  if (
                    formErrors.fullname
                  ) {
                    setFormErrors({
                      ...formErrors,

                      fullname:
                        undefined,
                    });
                  }
                }}
                className={cn(
                  fieldClass(
                    Boolean(
                      formErrors.fullname
                    ),

                    focusField ===
                      'name'
                  ),

                  'pl-11 md:pl-10'
                )}
                placeholder="Ex: John Smith"
              />

            </div>

            {formErrors.fullname && (
              <p className="text-xs font-medium text-destructive">
                {
                  formErrors.fullname
                }
              </p>
            )}

          </div>

          {/* ===================================================== */}
          {/* EMAIL + PHONE                                         */}
          {/* ===================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* =================================================== */}
            {/* EMAIL                                               */}
            {/* =================================================== */}

            <div className="space-y-2">

              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >

                <span>
                  Email Address
                </span>

                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (Optional)
                </span>

              </Label>

              <div className="relative">

                <Mail
                  className={cn(
                    'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4',

                    focusField ===
                      'email'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={
                    form.email
                  }
                  onFocus={() =>
                    setFocusField(
                      'email'
                    )
                  }
                  onBlur={() =>
                    setFocusField(
                      null
                    )
                  }
                  onChange={(e) => {
                    setForm({
                      ...form,

                      email:
                        e.target
                          .value,
                    });

                    if (
                      formErrors.email
                    ) {
                      setFormErrors({
                        ...formErrors,

                        email:
                          undefined,
                      });
                    }
                  }}
                  className={cn(
                    fieldClass(
                      Boolean(
                        formErrors.email
                      ),

                      focusField ===
                        'email'
                    ),

                    'pl-11 md:pl-10'
                  )}
                  placeholder="name@email.com"
                />

              </div>

              <p className="text-xs text-muted-foreground">
                Optional. The
                customer can use
                their phone number
                to log in.
              </p>

              {formErrors.email && (
                <p className="text-xs font-medium text-destructive">
                  {
                    formErrors.email
                  }
                </p>
              )}

            </div>

            {/* =================================================== */}
            {/* PHONE                                               */}
            {/* =================================================== */}

            <div className="space-y-2">

              <Label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Phone Number

                <span className="ml-1 text-xs font-normal text-destructive">
                  *
                </span>
              </Label>

              <div className="relative">

                <Phone
                  className={cn(
                    'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 md:h-4 md:w-4',

                    focusField ===
                      'phone'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />

                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={
                    form.phone
                  }
                  onFocus={() =>
                    setFocusField(
                      'phone'
                    )
                  }
                  onBlur={
                    handlePhoneBlur
                  }
                  onChange={(e) => {
                    setForm({
                      ...form,

                      phone:
                        e.target
                          .value,
                    });

                    if (
                      formErrors.phone
                    ) {
                      setFormErrors({
                        ...formErrors,

                        phone:
                          undefined,
                      });
                    }
                  }}
                  className={cn(
                    fieldClass(
                      Boolean(
                        formErrors.phone
                      ),

                      focusField ===
                        'phone'
                    ),

                    'pl-11 md:pl-10'
                  )}
                  placeholder="+63 9xx xxx xxxx"
                />

              </div>

              <p className="text-xs text-muted-foreground">
                Required. Philippine
                mobile number.
                Example:
                +639157803417
              </p>

              {formErrors.phone && (
                <p className="text-xs font-medium text-destructive">
                  {
                    formErrors.phone
                  }
                </p>
              )}

            </div>

          </div>

        </div>
      </DataModal>

      {/* ========================================================= */}
      {/* TEMPORARY PASSWORD DIALOG                                */}
      {/* ========================================================= */}

      {showTempDialog &&
        tempPassword && (
          <Dialog
            open={
              showTempDialog
            }
            onOpenChange={
              setShowTempDialog
            }
          >

            <DialogContent
              className="
                rounded-xl p-5 shadow-xl
                sm:max-w-md md:p-6
              "
            >

              {/* ================================================= */}
              {/* DIALOG HEADER                                    */}
              {/* ================================================= */}

              <DialogHeader className="items-center text-center">

                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">

                  <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />

                </div>

                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Customer Registered
                </DialogTitle>

                <DialogDescription className="max-w-sm text-sm leading-relaxed text-muted-foreground">

                  A temporary password
                  has been generated
                  for{' '}

                  <strong className="text-foreground">
                    {
                      form.fullname.trim()
                    }
                  </strong>
                  .

                </DialogDescription>

              </DialogHeader>

              <div className="space-y-4">

                {/* ================================================= */}
                {/* TEMPORARY PASSWORD                               */}
                {/* ================================================= */}

                <div className="relative overflow-hidden rounded-lg bg-foreground p-4 text-background md:p-5">

                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55">
                    Temporary password
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">

                    {/* =========================================== */}
                    {/* PASSWORD                                    */}
                    {/* =========================================== */}

                    <code className="break-all text-center font-mono text-xl font-semibold tracking-tight md:text-2xl">
                      {showTempPassword
                        ? tempPassword
                        : '••••••••'}
                    </code>

                    {/* =========================================== */}
                    {/* ACTIONS                                     */}
                    {/* =========================================== */}

                    <div className="flex gap-1">

                      {/* ----------------------------------------- */}
                      {/* SHOW / HIDE PASSWORD                     */}
                      {/* ----------------------------------------- */}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={
                          showTempPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                        title={
                          showTempPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                        className="
                          h-10 w-10 rounded-md
                          text-background/60
                          hover:bg-background/10
                          hover:text-background
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                          focus-visible:ring-offset-foreground
                        "
                        onClick={() => {
                          /*
                           * IMPORTANT:
                           *
                           * This ONLY changes
                           * password visibility.
                           *
                           * It does NOT change
                           * showTempDialog.
                           *
                           * Therefore the Dialog
                           * stays open.
                           */
                          setShowTempPassword(
                            current =>
                              !current
                          );
                        }}
                      >
                        {showTempPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      {/* ----------------------------------------- */}
                      {/* COPY PASSWORD                             */}
                      {/* ----------------------------------------- */}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={
                          passwordCopied
                            ? 'Password copied'
                            : 'Copy password'
                        }
                        title={
                          passwordCopied
                            ? 'Password copied'
                            : 'Copy password'
                        }
                        className={cn(
                          `
                            h-10 w-10 rounded-md
                            text-background/60
                            hover:bg-background/10
                            hover:text-background
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                            focus-visible:ring-offset-foreground
                          `,

                          passwordCopied &&
                            'text-emerald-400 hover:text-emerald-300'
                        )}
                        onClick={
                          handleCopyPassword
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                    </div>

                  </div>

                  {/* ============================================= */}
                  {/* COPY STATUS                                   */}
                  {/* ============================================= */}

                  {passwordCopied && (
                    <p className="mt-2 text-center text-xs font-medium text-emerald-400">
                      Password copied to clipboard.
                    </p>
                  )}

                </div>

                {/* ================================================= */}
                {/* REMINDER                                         */}
                {/* ================================================= */}

                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5">

                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Please save this
                    password. The
                    customer can use it
                    to log in with their
                    email or phone
                    number and will be
                    prompted to change
                    it after first login.
                  </p>

                </div>

                {/* ================================================= */}
                {/* DONE                                             */}
                {/* ================================================= */}

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
                  onClick={() => {
                    setShowTempDialog(
                      false
                    );

                    /*
                     * Reset local password UI
                     * state for the next customer.
                     */
                    setShowTempPassword(
                      true
                    );

                    setPasswordCopied(
                      false
                    );
                  }}
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