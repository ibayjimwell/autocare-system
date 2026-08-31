'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock, Search, CalendarDays, CheckCircle, XCircle,
} from 'lucide-react';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';
import { useServiceQueue } from '@/hooks/queue/useServiceQueue';
import { usePendingRescheduleRequests } from '@/hooks/appointments/usePendingRescheduleRequests';
import { format } from 'date-fns';
import { formatTime12h } from '@/app-utils/appointments/helpers';
import { cn } from '@/lib/utils';
import RescheduleRequestModal from './RescheduleRequestModal';

interface DailyAgendaProps {
  appointments: any[];
  selectedDate: Date;
  onConfirm: (appt: any) => void;
  onDecline: (appt: any, reason: string) => void;
  onRefresh?: () => void;
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'UNDER_INSPECTION', label: 'Under Inspection' },
  { value: 'WAITING_FOR_APPROVAL', label: 'Waiting Approval' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DailyAgenda({
  appointments,
  selectedDate,
  onConfirm,
  onDecline,
  onRefresh,
}: DailyAgendaProps) {
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    appointment: any | null;
    reason: string;
  }>({ open: false, appointment: null, reason: '' });

  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    appointment: any | null;
  }>({ open: false, appointment: null });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const { queue, loading: queueLoading } = useServiceQueue(dateStr, activeStatus === 'CONFIRMED');

  const appointmentIds = useMemo(() => {
    return appointments
      .filter((a) => a.appointmentDate && new Date(a.appointmentDate).toDateString() === selectedDate.toDateString())
      .map((a) => a.id);
  }, [appointments, selectedDate]);

  const { pendingMap, loading: pendingLoading } = usePendingRescheduleRequests(appointmentIds);

  const filteredAppointments = useMemo(() => {
    let data = appointments.filter((a) => {
      const matchesDate =
        a.appointmentDate && new Date(a.appointmentDate).toDateString() === selectedDate.toDateString();
      const searchStr =
        `${a.customer?.fullname} ${a.vehicle?.plateNumber} ${a.vehicle?.model}`.toLowerCase();
      const matchesSearch = searchStr.includes(sidebarFilter.toLowerCase());
      return matchesDate && matchesSearch;
    });

    if (activeStatus !== 'ALL') {
      data = data.filter((a) => a.status === activeStatus);
    }

    return data.sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }, [appointments, selectedDate, sidebarFilter, activeStatus]);

  const handleDeclineOpen = (appt: any) => {
    setDeclineModal({ open: true, appointment: appt, reason: '' });
  };

  const handleDeclineConfirm = () => {
    if (declineModal.appointment) {
      onDecline(declineModal.appointment, declineModal.reason);
      setDeclineModal({ open: false, appointment: null, reason: '' });
    }
  };

  const handleRescheduleOpen = (appt: any) => {
    setRescheduleModal({ open: true, appointment: appt });
  };

  const handleRescheduleSuccess = () => {
    if (onRefresh) onRefresh();
  };

  const renderQueue = () => {
    if (queueLoading) {
      return <div className="py-8 text-center text-sm text-muted-foreground">Loading queue...</div>;
    }
    if (queue.length === 0) {
      return <div className="py-8 text-center text-sm text-muted-foreground">No confirmed appointments for this date.</div>;
    }
    return (
      <div className="space-y-3">
        {queue.map((item) => (
          <Card key={item.queueId} className="flex flex-col gap-3 rounded-xl border-border p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-4 sm:w-auto">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl font-semibold tabular-nums text-primary">
                {item.queueNumber}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-foreground">{item.customer?.fullname || 'Customer'}</span>
                  <span className="text-xs text-muted-foreground">Plate: {item.vehicle?.plateNumber || 'N/A'}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{item.appointmentTime}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.services?.map((sid: string) => (
                    <ServiceCard key={sid} serviceId={sid} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderAppointments = () => {
    if (filteredAppointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No appointments for this status
          </p>
        </div>
      );
    }

    // Presentation-only grouping: bucket the (already time-sorted) list into
    // time slots so the day renders as a schedule timeline.
    const slots: { time: string; items: any[] }[] = [];
    filteredAppointments.forEach((appt) => {
      const slotTime = appt.appointmentTime || '—';
      const existing = slots.find((s) => s.time === slotTime);
      if (existing) existing.items.push(appt);
      else slots.push({ time: slotTime, items: [appt] });
    });

    return (
      <div className="space-y-1">
        {slots.map((slot) => (
          <div key={slot.time} className="flex gap-2 sm:gap-3">
            {/* Time gutter — the schedule's time axis */}
            <div className="w-16 shrink-0 pt-3.5 text-right">
              <span className="text-[11px] font-semibold tabular-nums tracking-wide text-muted-foreground">
                {slot.time === '—' ? 'N/A' : formatTime12h(slot.time)}
              </span>
            </div>

            {/* Rail + appointment blocks for this slot */}
            <div className="relative min-w-0 flex-1 space-y-3 border-l-2 border-border pb-5 pl-3 sm:pl-4">
              <span
                aria-hidden="true"
                className="absolute -left-[7px] top-4 h-3 w-3 rounded-full border-2 border-card bg-primary shadow-sm"
              />
              {slot.items.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  pendingRescheduleCount={pendingMap[appt.id] ? 1 : 0}
                  onReschedule={handleRescheduleOpen}
                >
                  <CustomerCard customerId={appt.customerId} />
                  <VehicleCard vehicleId={appt.vehicleId} customerId={appt.customerId} />
                  {appt.services && appt.services.length > 0 ? (
                    appt.services.map((service: any) => (
                      <ServiceCard key={service.id} serviceId={service.id} />
                    ))
                  ) : (
                    <div className="text-xs italic text-muted-foreground">No services selected.</div>
                  )}
                  <StaffCards appointmentId={appt.id} />
                  {appt.status === 'PENDING' && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-10 flex-1 rounded-md bg-emerald-600 text-xs font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 md:h-9"
                        onClick={() => onConfirm(appt)}
                      >
                        <CheckCircle className="h-4 w-4" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 flex-1 rounded-md text-xs font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/10 md:h-9"
                        onClick={() => handleDeclineOpen(appt)}
                      >
                        <XCircle className="h-4 w-4" /> Decline
                      </Button>
                    </div>
                  )}
                </AppointmentCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (activeStatus === 'CONFIRMED') {
      return renderQueue();
    }
    return renderAppointments();
  };

  const currentAppointment = rescheduleModal.appointment;

  return (
    <>
      {/* ---- Day schedule pane (mirrors the inspiration's schedule panel) ---- */}
      <Card className="flex h-full flex-col overflow-hidden rounded-xl border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="shrink-0 space-y-3 border-b border-border px-4 py-4 md:px-5">
          {/* Date header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Daily Agenda
              </CardTitle>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                {isToday && (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-full border-primary/25 bg-primary/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-primary"
                  >
                    Today
                  </Badge>
                )}
              </p>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide"
            >
              {filteredAppointments.length + (activeStatus === 'CONFIRMED' ? queue.length : 0)} Booked
            </Badge>
          </div>

          {/* Status tabs — segmented control */}
          <div className="flex gap-0.5 overflow-x-auto rounded-lg bg-muted p-1">
            {STATUS_TABS.map((tab) => {
              const isActive = activeStatus === tab.value;
              const count =
                tab.value === 'ALL'
                  ? appointments.filter((a) => a.appointmentDate && new Date(a.appointmentDate).toDateString() === selectedDate.toDateString()).length
                  : appointments.filter(
                      (a) =>
                        a.appointmentDate &&
                        new Date(a.appointmentDate).toDateString() === selectedDate.toDateString() &&
                        a.status === tab.value
                    ).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveStatus(tab.value)}
                  className={cn(
                    'h-8 shrink-0 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by plate or name..."
              className="h-10 rounded-md pl-10 text-base md:h-9 md:text-sm"
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
            />
          </div>
        </CardHeader>

        {/* ---- Timeline / queue content ---- */}
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {renderContent()}
        </CardContent>
      </Card>

      {/* ---- Decline Dialog ---- */}
      <Dialog open={declineModal.open} onOpenChange={(open) => setDeclineModal({ ...declineModal, open })}>
        <DialogContent className="rounded-none p-4 sm:rounded-xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Decline Appointment
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Provide a brief explanation for the customer regarding the cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Shop at capacity, parts backordered..."
              className="h-11 rounded-md text-base md:h-9 md:text-sm"
              value={declineModal.reason}
              onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeclineModal({ open: false, appointment: null, reason: '' })}
              className="h-11 rounded-md px-4 text-sm font-medium md:h-9"
            >
              Ignore
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              className="h-11 rounded-md px-4 text-sm font-semibold md:h-9"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Reschedule Request Modal ---- */}
      {currentAppointment && (
        <RescheduleRequestModal
          open={rescheduleModal.open}
          onOpenChange={(open) => setRescheduleModal({ ...rescheduleModal, open })}
          appointmentId={currentAppointment.id}
          currentDate={currentAppointment.appointmentDate}
          currentTime={currentAppointment.appointmentTime}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </>
  );
}