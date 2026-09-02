'use client';

import React, { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Settings,
  XCircle,
  CalendarDays,
  Plus,
  RefreshCw,
} from 'lucide-react';

import PageContainer from '@/components/shared/page-container';
import ErrorHandler from '@/components/shared/error-handler';
import AppointmentCalendar from '@/components/appointments/appointment-calendar';
import AppointmentsSkeleton from '@/components/skeleton/appointments-skeleton';
import BookingFormCard from '@/components/appointments/booking-form-card';
import DailyAgenda from '@/components/appointments/daily-agenda';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { GlobalConfigModal } from '@/components/configurations/global-config-modal';
import { DateConfigModal } from '@/components/configurations/date-config-modal';

import { useAppointmentData } from '@/hooks/appointments/useAppointmentData';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { useAuth } from '@/lib/auth/staffs/useAuth';
import { useConfigurations } from '@/hooks/configurations/useConfigurations';
import { getEffectiveConfigForDate } from '@/utils/configurations';

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

  const effective = config
    ? getEffectiveConfigForDate(config, selectedDateStr)
    : null;

  const isSelectedDateClosed = effective ? !effective.isOpen : false;

  const {
    appointments,
    initialLoading,
    customers,
    services,
    apiError,
    loadAppointments,
  } = useAppointmentData();

  const handleConfirm = async (appt: any) => {
    try {
      const res = await appointmentsApi.updateStatus(
        appt.id,
        'CONFIRMED',
      );

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

  const handleDecline = async (
    appointment: any,
    reason: string,
  ) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }

    try {
      const res = await appointmentsApi.updateStatus(
        appointment.id,
        'CANCELLED',
        reason.trim(),
      );

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
      <PageContainer
        title="Service Scheduler"
        subtitle="Confirm or decline customer bookings"
      >
        <AppointmentsSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Service Scheduler"
      subtitle="Confirm or decline customer bookings"
    >
      <div className="space-y-4 md:space-y-5 lg:space-y-6">
        {apiError && (
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        )}

        {/* Workspace toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Appointment Workspace
              </p>

              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>

                {isSelectedDateClosed ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-destructive/30 bg-destructive/10 text-[10px] font-semibold uppercase tracking-wide text-destructive"
                  >
                    Closed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/25 bg-primary/10 text-[10px] font-semibold uppercase tracking-wide text-primary"
                  >
                    Open for booking
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={loadAppointments}
              className="
                h-11 rounded-md px-4 text-base font-medium
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                md:h-9 md:px-3 md:text-sm
              "
            >
              <RefreshCw className="h-5 w-5 md:h-4 md:w-4" />
              Refresh
            </Button>

            {canConfigure && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setGlobalConfigOpen(true)}
                className="
                  h-11 rounded-md px-4 text-base font-medium
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  md:h-9 md:px-3 md:text-sm
                "
              >
                <Settings className="h-5 w-5 md:h-4 md:w-4" />
                Configure
              </Button>
            )}
          </div>
        </div>

        {/* Main scheduler workspace */}
        <div
          className="
            grid grid-cols-1 gap-4
            md:grid-cols-2 md:gap-5
            lg:[grid-template-columns:minmax(18rem,22rem)_minmax(0,1fr)]
            lg:items-start lg:gap-6
          "
        >
          {/* Left rail */}
          <aside className="space-y-4 md:space-y-5">
            <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
              <AppointmentCalendar
                currentMonth={currentMonth}
                onMonthChange={(dir: number) =>
                  setCurrentMonth(
                    addMonths(currentMonth, dir),
                  )
                }
                appointments={appointments}
                selectedDate={selectedDate}
                onDateClick={setSelectedDate}
                onConfigureDate={
                  canConfigure
                    ? () => setDateConfigOpen(true)
                    : undefined
                }
                closedDates={closedDates}
              />
            </Card>

            {isSelectedDateClosed && (
              <div
                className="
                  flex items-start gap-3 rounded-xl border border-destructive/25
                  bg-destructive/10 p-3.5 text-destructive
                  md:p-4
                "
              >
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    This date is closed
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-destructive/80">
                    No new appointments can be booked on this date.
                    {effective?.reason
                      ? ` Reason: ${effective.reason}`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            <BookingFormCard
              customers={customers}
              services={services}
              selectedDate={selectedDate}
              onSuccess={loadAppointments}
            />
          </aside>

          {/* Primary schedule */}
          <section className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="h-[calc(100vh-12rem)] min-h-[40rem] max-h-[64rem] lg:h-[calc(100vh-9.5rem)]">
              <DailyAgenda
                appointments={appointments}
                selectedDate={selectedDate}
                onConfirm={handleConfirm}
                onDecline={handleDecline}
                onRefresh={loadAppointments}
              />
            </div>
          </section>
        </div>
      </div>

      <GlobalConfigModal
        open={globalConfigOpen}
        onOpenChange={setGlobalConfigOpen}
      />

      <DateConfigModal
        open={dateConfigOpen}
        onOpenChange={setDateConfigOpen}
        date={selectedDate}
      />
    </PageContainer>
  );
}