// hooks/appointments/useAppointmentForm.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { appointmentFormSchema, AppointmentFormData } from '@/app-utils/appointments/schema';
import { vehiclesApi } from '@/lib/customers/vehicles';
import { appointmentsApi } from '@/lib/appointments/appointments';

export function useAppointmentForm(
  customers: any[],
  onSuccess: () => void
) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [customTimeChecked, setCustomTimeChecked] = useState<{ available: boolean; message: string } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedSlotType, setSelectedSlotType] = useState<'preset' | 'custom'>('preset');

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      services: [],
      appointmentDate: new Date(),
      appointmentTime: '',
      notes: '',
    },
  });

  const { watch, setValue, reset, handleSubmit, formState: { errors } } = form;
  const watchCustomerId = watch('customerId');
  const watchServices = watch('services');
  const watchDate = watch('appointmentDate');

  // Fetch vehicles when customer changes
  useEffect(() => {
    if (watchCustomerId) {
      (async () => {
        const res = await vehiclesApi.list(watchCustomerId);
        const data = res.error ? [] : (res.data || []);
        setVehicles(data);
        const currentVehicleId = watch('vehicleId');
        if (currentVehicleId && !data.some((v: any) => v.id === currentVehicleId)) {
          setSelectedVehicle(null);
          setValue('vehicleId', '');
        }
        const found = customers.find((c: any) => c.id === watchCustomerId);
        if (found) setSelectedCustomer(found);
      })();
    } else {
      setVehicles([]);
      setSelectedVehicle(null);
      setSelectedCustomer(null);
    }
  }, [watchCustomerId, customers]); // eslint-disable-line

  // Fetch available slots when date/services change
  useEffect(() => {
    if (watchDate && watchServices.length > 0) {
      (async () => {
        const dateStr = format(watchDate, 'yyyy-MM-dd');
        const res = await appointmentsApi.getAvailableSlots(dateStr, watchServices);
        setAvailableSlots(res.error ? [] : (res.data || []));
      })();
    } else {
      setAvailableSlots([]);
    }
  }, [watchDate, watchServices]);

  // Check custom time
  const handleCheckCustomTime = useCallback(async () => {
    if (!customTime || !watchDate || watchServices.length === 0) return;
    setCheckingAvailability(true);
    setCustomTimeChecked(null);
    try {
      const dateStr = format(watchDate, 'yyyy-MM-dd');
      const res = await appointmentsApi.checkAvailability(dateStr, customTime, watchServices);
      if (res.error) {
        toast.error(res.errorMessage || 'Error checking availability.');
      } else if (res.available) {
        setCustomTimeChecked({ available: true, message: 'Time is available!' });
        setValue('appointmentTime', customTime);
      } else {
        setCustomTimeChecked({ available: false, message: res.message || 'Slot is not available.' });
        setValue('appointmentTime', '');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error checking availability.');
    } finally {
      setCheckingAvailability(false);
    }
  }, [customTime, watchDate, watchServices, setValue]);

  // Submit
  const submitHandler = useCallback(async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        services: data.services,
        appointmentDate: format(data.appointmentDate, 'yyyy-MM-dd'),
        appointmentTime: data.appointmentTime,
        notes: data.notes || undefined,
      };
      const res = await appointmentsApi.create(payload);
      if (res.error) {
        toast.error(res.errorMessage || 'Booking failed.');
      } else {
        toast.success('Appointment booked successfully.');
        reset({
          ...data,
          appointmentTime: '',
          notes: '',
        });
        setCustomTime('');
        setCustomTimeChecked(null);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }, [reset, onSuccess]);

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