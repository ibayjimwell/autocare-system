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
      available: boolean;
    }[]
  >([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

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
    formState: {
      errors,
    },
  } =
    form;

  const watchCustomerId =
    watch(
      'customerId',
    );

  const watchServices =
    watch(
      'services',
    );

  const watchDate =
    watch(
      'appointmentDate',
    );

  /* ==============================================================
     FETCH VEHICLES WHEN CUSTOMER CHANGES
  ============================================================== */

  useEffect(() => {
    if (
      !watchCustomerId
    ) {
      setVehicles(
        [],
      );

      setSelectedVehicle(
        null,
      );

      setSelectedCustomer(
        null,
      );

      return;
    }

    let cancelled =
      false;

    const loadCustomerVehicles =
      async () => {
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
            res.error
              ? []
              : res.data ||
                [];

          setVehicles(
            data,
          );

          /* ======================================================
             CHECK CURRENT VEHICLE
          ======================================================= */

          const currentVehicleId =
            watch(
              'vehicleId',
            );

          if (
            currentVehicleId &&
            !data.some(
              (
                vehicle: any,
              ) =>
                vehicle.id ===
                currentVehicleId,
            )
          ) {
            setSelectedVehicle(
              null,
            );

            setValue(
              'vehicleId',
              '',
            );
          }

          /* ======================================================
             FIND SELECTED CUSTOMER
          ======================================================= */

          const found =
            customers.find(
              (
                customer: any,
              ) =>
                customer?.id ===
                watchCustomerId,
            );

          if (
            found
          ) {
            setSelectedCustomer(
              found,
            );
          } else {
            setSelectedCustomer(
              null,
            );
          }
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

          toast.error(
            error?.message ||
              'Failed to load customer vehicles.',
          );
        }
      };

    void loadCustomerVehicles();

    return () => {
      cancelled = true;
    };
    // customers intentionally participates in the lookup because
    // the selected customer object comes from this collection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchCustomerId,
    customers,
  ]);

  /* ==============================================================
     FETCH AVAILABLE SLOTS
     
     Runs whenever:
       - appointment date changes
       - selected services change
  ============================================================== */

  useEffect(() => {
    if (
      watchDate &&
      watchServices.length >
        0
    ) {
      let cancelled =
        false;

      const loadAvailableSlots =
        async () => {
          try {
            const dateStr =
              format(
                watchDate,
                'yyyy-MM-dd',
              );

            const res =
              await appointmentsApi.getAvailableSlots(
                dateStr,
                watchServices,
              );

            if (
              cancelled
            ) {
              return;
            }

            setAvailableSlots(
              res.error
                ? []
                : res.data ||
                    [],
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
              '[useAppointmentForm] Failed to load available slots:',
              error,
            );

            setAvailableSlots(
              [],
            );

            toast.error(
              error?.message ||
                'Failed to load available appointment slots.',
            );
          }
        };

      void loadAvailableSlots();

      return () => {
        cancelled = true;
      };
    }

    setAvailableSlots(
      [],
    );
  }, [
    watchDate,
    watchServices,
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
            );
          }
        } catch (
          err: any
        ) {
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
        setIsSubmitting(
          true,
        );

        try {
          const payload =
            {
              customerId:
                data.customerId,

              vehicleId:
                data.vehicleId,

              services:
                data.services,

              appointmentDate:
                format(
                  data.appointmentDate,
                  'yyyy-MM-dd',
                ),

              appointmentTime:
                data.appointmentTime,

              notes:
                data.notes ||
                undefined,
            };

          const res =
            await appointmentsApi.create(
              payload,
            );

          if (
            res.error
          ) {
            toast.error(
              res.errorMessage ||
                'Booking failed.',
            );

            return;
          }

          toast.success(
            'Appointment booked successfully.',
          );

          reset({
            ...data,

            appointmentTime:
              '',

            notes:
              '',
          });

          setCustomTime(
            '',
          );

          setCustomTimeChecked(
            null,
          );

          onSuccess();
        } catch (
          err: any
        ) {
          toast.error(
            err?.message ||
              'Something went wrong.',
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      },
      [
        reset,
        onSuccess,
      ],
    );

  /* ==============================================================
     RETURN
  ============================================================== */

  return {
    form,

    vehicles,

    selectedCustomer,

    selectedVehicle,

    setSelectedCustomer,

    setSelectedVehicle,

    availableSlots,

    isSubmitting,

    customTime,

    setCustomTime,

    customTimeChecked,

    setCustomTimeChecked,

    checkingAvailability,

    setCheckingAvailability,

    selectedSlotType,

    setSelectedSlotType,

    handleCheckCustomTime,

    submitHandler,
  };
}