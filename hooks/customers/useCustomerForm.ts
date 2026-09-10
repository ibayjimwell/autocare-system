'use client';

import {
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  customersApi,
} from '@/lib/customers/customers';

import {
  validateEmail,
  generateTempPassword,
} from '@/app-utils/customers/helpers';

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from '@/utils/phone';

export function useCustomerForm(
  onSuccess: () => void
) {
  const [
    form,
    setForm,
  ] = useState({
    fullname: '',
    email: '',
    phone: '',
  });

  const [
    editingCustomer,
    setEditingCustomer,
  ] = useState<any>(
    null
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formErrors,
    setFormErrors,
  ] = useState<
    Record<
      string,
      string | undefined
    >
  >({});

  const [
    tempPassword,
    setTempPassword,
  ] = useState<
    string | null
  >(null);

  const [
    showTempDialog,
    setShowTempDialog,
  ] = useState(
    false
  );

  const [
    apiError,
    setApiError,
  ] = useState<any>(
    null
  );

  // ---------------------------------------------------------------
  // Reset form
  // ---------------------------------------------------------------

  const resetForm = () => {
    setForm({
      fullname: '',
      email: '',
      phone: '',
    });

    setFormErrors({});

    setApiError(null);
  };

  // ---------------------------------------------------------------
  // Open create
  // ---------------------------------------------------------------

  const openCreate = () => {
    setEditingCustomer(
      null
    );

    resetForm();
  };

  // ---------------------------------------------------------------
  // Open edit
  // ---------------------------------------------------------------

  const openEdit = (
    customer: any
  ) => {
    setEditingCustomer(
      customer
    );

    setForm({
      fullname:
        customer.fullname ||
        '',

      /*
       * Database NULL becomes
       * an empty string for the form.
       */
      email:
        customer.email ||
        '',

      phone:
        customer.phone ||
        '',
    });

    setFormErrors({});

    setApiError(null);
  };

  // ---------------------------------------------------------------
  // Validate form
  // ---------------------------------------------------------------

  const validateForm =
    (): boolean => {
      const errors: Record<
        string,
        string
      > = {};

      // -----------------------------------------------------------
      // Full Name
      // -----------------------------------------------------------

      if (
        !form.fullname.trim()
      ) {
        errors.fullname =
          'Full name is required.';
      }

      // -----------------------------------------------------------
      // Email
      //
      // OPTIONAL
      // -----------------------------------------------------------

      if (
        form.email.trim()
      ) {
        if (
          !validateEmail(
            form.email.trim()
          )
        ) {
          errors.email =
            'Please enter a valid email address.';
        }
      }

      // -----------------------------------------------------------
      // Phone
      //
      // REQUIRED
      // -----------------------------------------------------------

      const normalizedPhone =
        normalizePhilippinePhone(
          form.phone
        );

      if (
        !form.phone.trim()
      ) {
        errors.phone =
          'Phone number is required.';
      } else if (
        !isValidPhilippinePhone(
          normalizedPhone
        )
      ) {
        errors.phone =
          'Enter a valid Philippine mobile number, e.g. 09157803417 or +639157803417.';
      }

      setFormErrors(
        errors
      );

      return (
        Object.keys(
          errors
        ).length === 0
      );
    };

  // ---------------------------------------------------------------
  // Save customer
  // ---------------------------------------------------------------

  const handleSave =
    async () => {
      if (
        !validateForm()
      ) {
        return;
      }

      setSaving(true);

      setApiError(null);

      try {
        // ---------------------------------------------------------
        // Normalize phone
        // ---------------------------------------------------------

        const normalizedPhone =
          normalizePhilippinePhone(
            form.phone
          );

        // ---------------------------------------------------------
        // Normalize email
        //
        // Empty input becomes null
        // internally.
        // ---------------------------------------------------------

        const normalizedEmail =
          form.email.trim()
            ? form.email
                .trim()
                .toLowerCase()
            : null;

        // ---------------------------------------------------------
        // UPDATE EXISTING CUSTOMER
        // ---------------------------------------------------------

        if (
          editingCustomer
        ) {
          /*
           * JSON request:
           *
           * null stays null.
           *
           * This allows an existing email
           * to be removed.
           */
          const payload = {
            fullname:
              form.fullname.trim(),

            email:
              normalizedEmail,

            phone:
              normalizedPhone,
          };

          const res =
            await customersApi.update(
              editingCustomer.id,
              payload
            );

          if (res.error) {
            setApiError({
              type:
                res.errorType ||
                'fve',

              title:
                res.errorTitle ||
                'Error',

              message:
                res.errorMessage ||
                'Operation failed.',
            });

            return;
          }

          toast.success(
            res.message ||
              'Customer updated.'
          );

          onSuccess();

          return;
        }

        // ---------------------------------------------------------
        // CREATE NEW CUSTOMER
        // ---------------------------------------------------------

        const tempPw =
          generateTempPassword(
            form.fullname.trim()
          );

        /*
         * IMPORTANT:
         *
         * customersApi.create()
         * sends FormData.
         *
         * FormData converts:
         *
         * null
         * ↓
         * "null"
         *
         * Therefore empty email MUST be
         * sent as an empty string here.
         *
         * The backend converts:
         *
         * ""
         * ↓
         * null
         *
         * before database insertion.
         */
        const createPayload = {
          fullname:
            form.fullname.trim(),

          email:
            normalizedEmail ||
            '',

          phone:
            normalizedPhone,

          password:
            tempPw,

          tempPassword:
            true,
        };

        const res =
          await customersApi.create(
            createPayload
          );

        if (res.error) {
          setApiError({
            type:
              res.errorType ||
              'fve',

            title:
              res.errorTitle ||
              'Error',

            message:
              res.errorMessage ||
              'Operation failed.',
          });

          return;
        }

        toast.success(
          'Customer created.'
        );

        // ---------------------------------------------------------
        // Show generated temporary password
        // ---------------------------------------------------------

        setTempPassword(
          tempPw
        );

        setShowTempDialog(
          true
        );

        onSuccess();
      } catch (
        err: any
      ) {
        console.error(
          '[useCustomerForm] Save customer error:',
          err
        );

        setApiError({
          type:
            'se',

          title:
            'Unexpected Error',

          message:
            err?.message ||
            'Something went wrong.',
        });
      } finally {
        setSaving(false);
      }
    };

  return {
    form,
    setForm,

    editingCustomer,

    saving,

    formErrors,
    setFormErrors,

    apiError,
    setApiError,

    openCreate,
    openEdit,

    handleSave,

    tempPassword,

    showTempDialog,
    setShowTempDialog,
  };
}