// components/appointments/daily-agenda.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock, Search, CalendarDays, CheckCircle, XCircle, Hash,
} from 'lucide-react';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';
import { useServiceQueue } from '@/hooks/queue/useServiceQueue';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DailyAgendaProps {
  appointments: any[];
  selectedDate: Date;
  onConfirm: (appt: any) => void;
  onDecline: (appt: any, reason: string) => void;
}

// Status tabs (order matches the typical workflow)
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
}: DailyAgendaProps) {
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    appointment: any | null;
    reason: string;
  }>({ open: false, appointment: null, reason: '' });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  // Fetch queue for the selected date (only if status tab is CONFIRMED)
  const { queue, loading: queueLoading } = useServiceQueue(dateStr, activeStatus === 'CONFIRMED');

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

  // Render queue for CONFIRMED status
  const renderQueue = () => {
    if (queueLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading queue...</div>;
    }
    if (queue.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No confirmed appointments for this date.</div>;
    }
    return (
      <div className="space-y-4">
        {queue.map((item) => (
          <Card key={item.queueId} className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="text-4xl font-black text-primary w-12 text-center">
                {item.queueNumber}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{item.customer?.fullname || 'Customer'}</span>
                  <span className="text-sm text-muted-foreground">Plate: {item.vehicle?.plateNumber || 'N/A'}</span>
                  <span className="text-sm text-muted-foreground">{item.appointmentTime}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
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

  // Render appointment cards for non‑CONFIRMED statuses
  const renderAppointments = () => {
    if (filteredAppointments.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="text-slate-300 w-8 h-8" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase">
            No appointments for this status
          </p>
        </div>
      );
    }
    return filteredAppointments.map((appt) => (
      <AppointmentCard key={appt.id} appointment={appt}>
        <CustomerCard customerId={appt.customerId} />
        <VehicleCard vehicleId={appt.vehicleId} customerId={appt.customerId} />
        {appt.services && appt.services.length > 0 ? (
          appt.services.map((service: any) => (
            <ServiceCard key={service.id} serviceId={service.id} />
          ))
        ) : (
          <div className="text-xs text-muted-foreground italic">No services selected.</div>
        )}
        <StaffCards appointmentId={appt.id} />
        {appt.status === 'PENDING' && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="flex-1 text-green-600 bg-green-50 hover:bg-green-100 h-8 text-[10px] font-black uppercase"
              onClick={() => onConfirm(appt)}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-red-400 hover:bg-red-50 h-8 text-[10px] font-black uppercase"
              onClick={() => handleDeclineOpen(appt)}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
            </Button>
          </div>
        )}
      </AppointmentCard>
    ));
  };

  // Determine what to render based on active status
  const renderContent = () => {
    if (activeStatus === 'CONFIRMED') {
      return renderQueue();
    }
    return renderAppointments();
  };

  return (
    <>
      <Card className="flex flex-col h-full shadow-xl border-none rounded-3xl bg-white">
        <CardHeader className="bg-slate-900 text-white py-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Daily Agenda
              </CardTitle>
              <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {filteredAppointments.length + (activeStatus === 'CONFIRMED' ? queue.length : 0)} Booked
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-800/50 p-1 rounded-xl overflow-x-auto">
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
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap',
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    {tab.label} <span className="text-[10px] opacity-50">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Filter by plate or name..."
                className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-slate-400 h-10 rounded-xl"
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-6 space-y-4">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={declineModal.open} onOpenChange={(open) => setDeclineModal({ ...declineModal, open })}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Decline Appointment</DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-500">
              Provide a brief explanation for the customer regarding the cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Shop at capacity, parts backordered..."
              className="h-12 rounded-xl bg-slate-50"
              value={declineModal.reason}
              onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeclineModal({ open: false, appointment: null, reason: '' })}
              className="font-bold uppercase text-xs"
            >
              Ignore
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              className="font-black uppercase text-xs px-6 rounded-xl"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}