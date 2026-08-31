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
          <ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} />
        </div>
      )}

      {/* ---- Toolbar: configurator action, right-aligned ---- */}
      {canConfigure && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setGlobalConfigOpen(true)}
            className="h-11 rounded-md px-4 text-base font-medium md:h-9 md:px-3 md:text-sm"
          >
            <Settings className="h-5 w-5 md:h-4 md:w-4" />
            Configure Settings
          </Button>
        </div>
      )}

      {/*
        Layout (mirrors the inspiration):
        · Right pane (60%): the day schedule — time-axis timeline, pinned viewport height.
        · Left column (40%): month calendar for date navigation, booking form beneath.
        · Mobile (< lg): stacks in flow order — Calendar → Agenda → Booking.
      */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:items-start lg:[grid-template-columns:minmax(0,2fr)_minmax(0,3fr)] lg:[grid-template-areas:'calendar_agenda'_'booking_agenda']">
        {/* ---- Month calendar + closed-date notice ---- */}
        <div className="flex flex-col gap-4 md:gap-6 lg:[grid-area:calendar]">
          <Card className="overflow-hidden rounded-xl border-border bg-card text-card-foreground shadow-sm">
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
            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>
                This date is closed. No appointments can be booked.
                {effective?.reason && ` Reason: ${effective.reason}`}
              </span>
            </div>
          )}
        </div>

        {/* ---- Day schedule (primary pane, mirrors the image) ---- */}
        <div className="lg:sticky lg:top-24 lg:self-start lg:[grid-area:agenda]">
          <div className="lg:h-[calc(100vh-11rem)] lg:min-h-[30rem]">
            <DailyAgenda
              appointments={appointments}
              selectedDate={selectedDate}
              onConfirm={handleConfirm}
              onDecline={handleDecline}
              onRefresh={loadAppointments}
            />
          </div>
        </div>

        {/* ---- Booking form ---- */}
        <div className="lg:[grid-area:booking]">
          <BookingFormCard
            customers={customers}
            services={services}
            selectedDate={selectedDate}
            onSuccess={loadAppointments}
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