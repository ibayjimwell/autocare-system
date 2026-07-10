// app/(main)/appointments/page.tsx
'use client';

import React, { useState } from 'react';
import { addMonths } from 'date-fns';
import { toast } from 'sonner';
import PageContainer from '@/components/shared/page-container';
import ErrorHandler from '@/components/shared/error-handler';
import AppointmentCalendar from '@/components/appointments/appointment-calendar';
import AppointmentsSkeleton from '@/components/skeleton/appointments-skeleton';
import BookingFormCard from '@/components/appointments/booking-form-card';
import DailyAgenda from '@/components/appointments/daily-agenda';
import { Card } from '@/components/ui/card';
import { useAppointmentData } from '@/hooks/appointments/useAppointmentData';
import { appointmentsApi } from '@/lib/appointments/appointments';

export default function AppointmentsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    appointments,
    initialLoading,
    customers,
    services,
    apiError,
    loadAppointments,
  } = useAppointmentData();

  // Confirm handler
  const handleConfirm = async (appt: any) => {
    try {
      const res = await appointmentsApi.updateStatus(appt.id, 'CONFIRMED');
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to confirm.');
      } else {
        toast.success('Appointment confirmed.');
        loadAppointments();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error confirming.');
    }
  };

  // Decline handler – receives reason
  const handleDecline = async (appointment: any, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    try {
      const res = await appointmentsApi.updateStatus(appointment.id, 'CANCELLED', reason.trim());
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to decline.');
      } else {
        toast.success('Appointment declined.');
        loadAppointments();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error declining.');
    }
  };

  if (initialLoading) {
    return (
      <PageContainer title="Service Scheduler" subtitle="Confirm or decline customer bookings">
        <AppointmentsSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Service Scheduler" subtitle="Confirm or decline customer bookings">
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Calendar + Booking Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <AppointmentCalendar
              currentMonth={currentMonth}
              onMonthChange={(dir: number) => setCurrentMonth(addMonths(currentMonth, dir))}
              appointments={appointments}
              selectedDate={selectedDate}
              onDateClick={setSelectedDate}
            />
          </Card>

          <BookingFormCard
            customers={customers}
            services={services}
            selectedDate={selectedDate}
            onSuccess={loadAppointments}
          />
        </div>

        {/* Right: Daily Agenda */}
        <div className="lg:col-span-4 h-full">
          <DailyAgenda
            appointments={appointments}
            selectedDate={selectedDate}
            onConfirm={handleConfirm}
            onDecline={handleDecline}
          />
        </div>
      </div>
    </PageContainer>
  );
}