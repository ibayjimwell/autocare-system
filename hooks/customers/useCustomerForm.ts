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
  ] = useState<any>(null);

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
  ] = useState(false);

  const [
    apiError,
    setApiError,
  ] = useState<any>(null);

  const resetForm = () => {
    setForm({
      fullname: '',
      email: '',
      phone: '',
    });

    setFormErrors({});
    setApiError(null);
  };

  const openCreate = () => {
    setEditingCustomer(
      null
    );

    resetForm();
  };

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

  const validateForm =
    (): boolean => {
      const errors: Record<
        string,
        string
      > = {};

      if (
        !form.fullname.trim()
      ) {
        errors.fullname =
          'Full name is required.';
      }

      if (
        !form.email.trim()
      ) {
        errors.email =
          'Email is required.';
      } else if (
        !validateEmail(
          form.email.trim()
        )
      ) {
        errors.email =
          'Please enter a valid email address.';
      }

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
        const normalizedPhone =
          normalizePhilippinePhone(
            form.phone
          );

        const payload = {
          fullname:
            form.fullname.trim(),

          email:
            form.email
              .trim()
              .toLowerCase(),

          /*
           * Always send normalized
           * international format.
           */
          phone:
            normalizedPhone,
        };

        if (
          editingCustomer
        ) {
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
            'Customer updated.'
          );

          onSuccess();

          return;
        }

        const tempPw =
          generateTempPassword(
            form.fullname.trim()
          );

        const res =
          await customersApi.create({
            ...payload,

            password:
              tempPw,

            tempPassword:
              true,
          });

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

        setTempPassword(
          tempPw
        );

        setShowTempDialog(
          true
        );

        onSuccess();
      } catch (err: any) {
        setApiError({
          type: 'se',
          title:
            'Unexpected Error',
          message:
            err.message ||
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