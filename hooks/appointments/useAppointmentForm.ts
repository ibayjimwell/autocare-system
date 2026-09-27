'use client';

import {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  useForm,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  format,
} from 'date-fns';

import {
  toast,
} from 'sonner';

import {
  appointmentFormSchema,
  AppointmentFormData,
} from '@/app-utils/appointments/schema';

import {
  vehiclesApi,
} from '@/lib/customers/vehicles';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

/* ========================================================================
   HOOK
======================================================================== */

export function useAppointmentForm(
  customers: any[],
  onSuccess: () => void,
) {
  /* ==============================================================
     STATE
  ============================================================== */

  const [
    vehicles,
    setVehicles,
  ] = useState<any[]>([]);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<any>(
    null,
  );

  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState<any>(
    null,
  );

  const [
    availableSlots,
    setAvailableSlots,
  ] = useState<
    {
      time: string;
      available?: boolean;
    }[]
  >([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

  /* ==============================================================
     DOUBLE BOOKING CONFLICT
  ============================================================== */

  const [
    duplicateConflict,
    setDuplicateConflict,
  ] = useState<any>(null);

  const [
    mergingDuplicate,
    setMergingDuplicate,
  ] = useState(false);

  const [
    customTime,
    setCustomTime,
  ] = useState(
    '',
  );

  const [
    customTimeChecked,
    setCustomTimeChecked,
  ] = useState<{
    available: boolean;
    message: string;
  } | null>(
    null,
  );

  const [
    checkingAvailability,
    setCheckingAvailability,
  ] = useState(
    false,
  );

  const [
    selectedSlotType,
    setSelectedSlotType,
  ] = useState<
    'preset' | 'custom'
  >(
    'preset',
  );

  /* ==============================================================
     LOADING STATE
  ============================================================== */

  /*
   * Customer data itself is supplied by the parent component.
   *
   * This hook owns vehicle loading because vehicles are fetched
   * after a customer is selected.
   */
  const [
    loadingVehicles,
    setLoadingVehicles,
  ] = useState(
    false,
  );

  /*
   * Available appointment slots are fetched whenever the
   * appointment date or selected services change.
   */
  const [
    loadingAvailableSlots,
    setLoadingAvailableSlots,
  ] = useState(
    false,
  );

  /* ==============================================================
     FORM
  ============================================================== */

  const form =
    useForm<AppointmentFormData>({
      resolver:
        zodResolver(
          appointmentFormSchema,
        ),

      defaultValues: {
        customerId:
          '',

        vehicleId:
          '',

        services:
          [],

        appointmentDate:
          new Date(),

        appointmentTime:
          '',

        notes:
          '',
      },
    });

  const {
    watch,
    setValue,
    reset,
  } =
    form;

  const watchCustomerId =
    watch(
      'customerId',
    );

  const watchVehicleId =
    watch(
      'vehicleId',
    );

  const watchServices =
    watch(
      'services',
    ) || [];

  const watchDate =
    watch(
      'appointmentDate',
    );

  /* ==============================================================
     KEEP SELECTED CUSTOMER SYNCHRONIZED
     
     The customer picker can explicitly call:
     
       setSelectedCustomer(customer)
     
     This effect also keeps the selected object synchronized with
     the customerId currently stored inside react-hook-form.
  ============================================================== */

  useEffect(() => {
    if (
      !watchCustomerId
    ) {
      setSelectedCustomer(
        null,
      );

      return;
    }

    const foundCustomer =
      customers.find(
        (
          customer: any,
        ) =>
          customer?.id ===
          watchCustomerId,
      );

    setSelectedCustomer(
      foundCustomer ||
        null,
    );
  }, [
    watchCustomerId,
    customers,
  ]);

  /* ==============================================================
     FETCH VEHICLES WHEN CUSTOMER CHANGES
  ============================================================== */

  useEffect(() => {
    /*
     * No customer selected.
     *
     * Clear all vehicle-related state immediately.
     */
    if (
      !watchCustomerId
    ) {
      setVehicles(
        [],
      );

      setSelectedVehicle(
        null,
      );

      setValue(
        'vehicleId',
        '',
        {
          shouldValidate:
            true,
        },
      );

      setLoadingVehicles(
        false,
      );

      return;
    }

    let cancelled =
      false;

    const loadCustomerVehicles =
      async () => {
        /*
         * Clear stale vehicle data immediately while the
         * new customer's vehicles are being fetched.
         */
        setLoadingVehicles(
          true,
        );

        setVehicles(
          [],
        );

        /*
         * Prevent the previous customer's selected vehicle
         * from temporarily appearing for the new customer.
         */
        setSelectedVehicle(
          null,
        );

        setValue(
          'vehicleId',
          '',
          {
            shouldValidate:
              true,
            shouldDirty:
              false,
          },
        );

        try {
          const res =
            await vehiclesApi.list(
              watchCustomerId,
            );

          if (
            cancelled
          ) {
            return;
          }

          const data =
            res?.error
              ? []
              : res?.data ||
                [];

          setVehicles(
            Array.isArray(
              data,
            )
              ? data
              : [],
          );

          /* ======================================================
             FIND CURRENT VEHICLE
          ======================================================= */

          /*
           * Normally this will be empty because changing the
           * customer clears the vehicle selection.
           *
           * The check remains here so the hook stays safe if the
           * parent/form restores an existing vehicle value.
           */
          const currentVehicleId =
            watch(
              'vehicleId',
            );

          if (
            currentVehicleId
          ) {
            const currentVehicle =
              data.find(
                (
                  vehicle: any,
                ) =>
                  vehicle?.id ===
                  currentVehicleId,
              );

            if (
              currentVehicle
            ) {
              setSelectedVehicle(
                currentVehicle,
              );
            } else {
              setSelectedVehicle(
                null,
              );

              setValue(
                'vehicleId',
                '',
              );
            }
          }

          /* ======================================================
             FIND CUSTOMER
          ======================================================= */

          const foundCustomer =
            customers.find(
              (
                customer: any,
              ) =>
                customer?.id ===
                watchCustomerId,
            );

          setSelectedCustomer(
            foundCustomer ||
              null,
          );
        } catch (
          error: any
        ) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            '[useAppointmentForm] Failed to load vehicles:',
            error,
          );

          setVehicles(
            [],
          );

          setSelectedVehicle(
            null,
          );

          setValue(
            'vehicleId',
            '',
          );

          toast.error(
            error?.message ||
              'Failed to load customer vehicles.',
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingVehicles(
              false,
            );
          }
        }
      };

    void loadCustomerVehicles();

    return () => {
      cancelled = true;
    };
    // customers intentionally participates because the selected
    // customer object comes from this collection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchCustomerId,
    customers,
  ]);

  /* ==============================================================
     FETCH AVAILABLE TIMES

     The available time list is intentionally independent of:
       - selected service duration
       - existing appointment duration
       - existing appointment occupancy

     The endpoint returns the complete 30-minute time grid defined by
     the shop opening and closing hours for the selected date.
  ============================================================== */

  useEffect(() => {
    if (!watchDate) {
      setAvailableSlots(
        [],
      );

      setLoadingAvailableSlots(
        false,
      );

      setValue(
        'appointmentTime',
        '',
      );

      setCustomTime(
        '',
      );

      setCustomTimeChecked(
        null,
      );

      setSelectedSlotType(
        'preset',
      );

      return;
    }

    let cancelled =
      false;

    const loadAvailableSlots =
      async () => {
        setLoadingAvailableSlots(
          true,
        );

        setAvailableSlots(
          [],
        );

        setValue(
          'appointmentTime',
          '',
        );

        setCustomTimeChecked(
          null,
        );

        try {
          const dateStr =
            format(
              watchDate,
              'yyyy-MM-dd',
            );

          /*
           * Only the selected date is needed now.
           *
           * The backend derives the complete time list from the
           * effective opening/closing hours for this date.
           */
          const res =
            await appointmentsApi.getAvailableSlots(
              dateStr,
            );

          if (
            cancelled
          ) {
            return;
          }

          const data =
            res?.error
              ? []
              : res?.data ||
                [];

          setAvailableSlots(
            Array.isArray(
              data,
            )
              ? data
              : [],
          );
        } catch (
          error: any
        ) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            '[useAppointmentForm] Failed to load available times:',
            error,
          );

          setAvailableSlots(
            [],
          );

          toast.error(
            error?.message ||
              'Failed to load available appointment times.',
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoadingAvailableSlots(
              false,
            );
          }
        }
      };

    void loadAvailableSlots();

    return () => {
      cancelled = true;
    };
  }, [
    watchDate,
    setValue,
  ]);

  /* ==============================================================
     CHECK CUSTOM TIME
  ============================================================== */

  const handleCheckCustomTime =
    useCallback(
      async () => {
        if (
          !customTime ||
          !watchDate ||
          watchServices.length ===
            0
        ) {
          return;
        }

        setCheckingAvailability(
          true,
        );

        setCustomTimeChecked(
          null,
        );

        try {
          const dateStr =
            format(
              watchDate,
              'yyyy-MM-dd',
            );

          const res =
            await appointmentsApi.checkAvailability(
              dateStr,
              customTime,
              watchServices,
            );

          if (
            res.error
          ) {
            toast.error(
              res.errorMessage ||
                'Error checking availability.',
            );

            return;
          }

          if (
            res.available
          ) {
            setCustomTimeChecked(
              {
                available:
                  true,

                message:
                  'Time is available!',
              },
            );

            setValue(
              'appointmentTime',
              customTime,
              {
                shouldValidate:
                  true,
                shouldDirty:
                  true,
              },
            );
          } else {
            setCustomTimeChecked(
              {
                available:
                  false,

                message:
                  res.message ||
                  'Slot is not available.',
              },
            );

            setValue(
              'appointmentTime',
              '',
              {
                shouldValidate:
                  true,
              },
            );
          }
        } catch (
          err: any
        ) {
          console.error(
            '[useAppointmentForm] Failed to check custom time:',
            err,
          );

          toast.error(
            err?.message ||
              'Error checking availability.',
          );
        } finally {
          setCheckingAvailability(
            false,
          );
        }
      },
      [
        customTime,
        watchDate,
        watchServices,
        setValue,
      ],
    );

  /* ==============================================================
     SUBMIT
  ============================================================== */

  const submitHandler =
    useCallback(
      async (
        data: AppointmentFormData,
      ) => {
        setIsSubmitting(true);
        setDuplicateConflict(null);

        try {
          const payload = {
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            services: data.services,
            appointmentDate: format(
              data.appointmentDate,
              'yyyy-MM-dd',
            ),
            appointmentTime: data.appointmentTime,
            notes: data.notes || undefined,
          };

          const res = await appointmentsApi.create(payload);

          if (res?.error) {
            if (res?.errorCode === 'APPOINTMENT_DUPLICATE') {
              setDuplicateConflict({
                ...res,
                request: payload,
                requestFormData: data,
              });

              return {
                success: false,
                duplicate: true,
                conflict: res,
              };
            }

            toast.error(
              res.errorMessage || 'Booking failed.',
            );

            return {
              success: false,
            };
          }

          toast.success(
            'Appointment booked successfully.',
          );

          reset({
            ...data,
            appointmentTime: '',
            notes: '',
          });

          setCustomTime('');
          setCustomTimeChecked(null);
          setSelectedSlotType('preset');
          setDuplicateConflict(null);

          onSuccess();

          return {
            success: true,
            appointment: res?.data || null,
            appointmentId: res?.data?.id || null,
          };
        } catch (err: any) {
          console.error(
            '[useAppointmentForm] Failed to create appointment:',
            err,
          );

          toast.error(
            err?.message || 'Something went wrong.',
          );

          return {
            success: false,
          };
        } finally {
          setIsSubmitting(false);
        }
      },
      [
        reset,
        onSuccess,
      ],
    );

  /* ==============================================================
     MERGE DUPLICATE SERVICES
  ============================================================== */

  const mergeDuplicate = useCallback(
    async () => {
      if (
        !duplicateConflict?.existingAppointment?.id ||
        !Array.isArray(duplicateConflict?.missingServices) ||
        duplicateConflict.missingServices.length === 0
      ) {
        return false;
      }

      setMergingDuplicate(true);

      try {
        const original = duplicateConflict.request;

        if (!original) {
          toast.error(
            'The original booking details are no longer available. Please submit again.',
          );
          return false;
        }

        const res = await appointmentsApi.create({
          ...original,
          duplicateAction: 'MERGE_SERVICES',
          existingAppointmentId:
            duplicateConflict.existingAppointment.id,
        });

        if (res?.error) {
          toast.error(
            res.errorMessage ||
              'Failed to add the services to the existing appointment.',
          );
          return false;
        }

        toast.success(
          'Services were added to the existing appointment.',
        );

        setDuplicateConflict(null);

        const originalData = duplicateConflict.requestFormData;

        if (originalData) {
          reset({
            ...originalData,
            appointmentTime: '',
            notes: '',
          });
        }

        setCustomTime('');
        setCustomTimeChecked(null);
        setSelectedSlotType('preset');
        onSuccess();

        return true;
      } catch (err: any) {
        console.error(
          '[useAppointmentForm] Failed to merge duplicate appointment:',
          err,
        );

        toast.error(
          err?.message ||
            'Failed to add the services to the existing appointment.',
        );

        return false;
      } finally {
        setMergingDuplicate(false);
      }
    },
    [
      duplicateConflict,
      reset,
      onSuccess,
    ],
  );

  const clearDuplicateConflict = useCallback(() => {
    setDuplicateConflict(null);
  }, []);

  /* ==============================================================
     RETURN
  ============================================================== */

  return {
    /* ============================================================
       FORM
    ============================================================= */

    form,

    /* ============================================================
       CUSTOMER / VEHICLE
    ============================================================= */

    vehicles,

    selectedCustomer,

    selectedVehicle,

    setSelectedCustomer,

    setSelectedVehicle,

    loadingVehicles,

    /* ============================================================
       AVAILABLE SLOTS
    ============================================================= */

    availableSlots,

    loadingAvailableSlots,

    /* ============================================================
       SUBMIT
    ============================================================= */

    isSubmitting,

    duplicateConflict,
    mergeDuplicate,
    mergingDuplicate,
    clearDuplicateConflict,

    /* ============================================================
       CUSTOM TIME
    ============================================================= */

    customTime,

    setCustomTime,

    customTimeChecked,

    setCustomTimeChecked,

    checkingAvailability,

    setCheckingAvailability,

    selectedSlotType,

    setSelectedSlotType,

    /* ============================================================
       ACTIONS
    ============================================================= */

    handleCheckCustomTime,

    submitHandler,
  };
}

