'use client';

import React, { useState } from 'react';
import { addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Settings, XCircle } from 'lucide-react';
import PageContainer from '@/components/shared/page-container';
import ErrorHandler from '@/components/shared/error-handler';
import AppointmentCalendar from '@/components/appointments/appointment-calendar';
import AppointmentsSkeleton from '@/components/skeleton/appointments-skeleton';
import BookingFormCard from '@/components/appointments/booking-form-card';
import DailyAgenda from '@/components/appointments/daily-agenda';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlobalConfigModal } from '@/components/configurations/global-config-modal';
import { DateConfigModal } from '@/components/configurations/date-config-modal';
import { useAppointmentData } from '@/hooks/appointments/useAppointmentData';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { useAuth } from '@/lib/auth/staffs/useAuth';
import { useConfigurations } from '@/hooks/configurations/useConfigurations';
import { getEffectiveConfigForDate } from '@/utils/configurations';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [globalConfigOpen, setGlobalConfigOpen] = useState(false);
  const [dateConfigOpen, setDateConfigOpen] = useState(false);

  const { hasPermission } = useAuth();
  const canConfigure = hasPermission('appointments');

  const { config } = useConfigurations();
  const closedDates = config
    ? Object.entries(config.dateOverrides)
        .filter(([_, override]) => override.isOpen === false)
        .map(([date]) => date)
    : [];

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const effective = config ? getEffectiveConfigForDate(config, selectedDateStr) : null;
  const isSelectedDateClosed = effective ? !effective.isOpen : false;

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

  // Decline handler
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

      {canConfigure && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGlobalConfigOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure Settings
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <AppointmentCalendar
              currentMonth={currentMonth}
              onMonthChange={(dir: number) => setCurrentMonth(addMonths(currentMonth, dir))}
              appointments={appointments}
              selectedDate={selectedDate}
              onDateClick={setSelectedDate}
              onConfigureDate={canConfigure ? () => setDateConfigOpen(true) : undefined}
              closedDates={closedDates}
            />
          </Card>

          {isSelectedDateClosed && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                This date is closed. No appointments can be booked.
                {effective?.reason && ` Reason: ${effective.reason}`}
              </span>
            </div>
          )}

          <BookingFormCard
            customers={customers}
            services={services}
            selectedDate={selectedDate}
            onSuccess={loadAppointments}
          />
        </div>

        <div className="lg:col-span-4 h-full">
          <DailyAgenda
            appointments={appointments}
            selectedDate={selectedDate}
            onConfirm={handleConfirm}
            onDecline={handleDecline}
            onRefresh={loadAppointments}
          />
        </div>
      </div>

      <GlobalConfigModal open={globalConfigOpen} onOpenChange={setGlobalConfigOpen} />
      <DateConfigModal
        open={dateConfigOpen}
        onOpenChange={setDateConfigOpen}
        date={selectedDate}
      />
    </PageContainer>
  );
}