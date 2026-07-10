// components/appointments/daily-agenda.tsx
'use client';

import React, { useState } from 'react';
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
  Clock, Search, CalendarDays, CheckCircle, XCircle,
} from 'lucide-react';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';

interface DailyAgendaProps {
  appointments: any[];
  selectedDate: Date;
  onConfirm: (appt: any) => void;
  onDecline: (appt: any, reason: string) => void;   // <-- now accepts reason
}

export default function DailyAgenda({
  appointments,
  selectedDate,
  onConfirm,
  onDecline,
}: DailyAgendaProps) {
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    appointment: any | null;
    reason: string;
  }>({ open: false, appointment: null, reason: '' });

  const filteredAppointments = appointments
    .filter((a) => {
      const matchesDate =
        a.appointmentDate && new Date(a.appointmentDate).toDateString() === selectedDate.toDateString();
      const searchStr =
        `${a.customer?.fullname} ${a.vehicle?.plateNumber} ${a.vehicle?.model}`.toLowerCase();
      const matchesSearch = searchStr.includes(sidebarFilter.toLowerCase());
      return matchesDate && matchesSearch;
    })
    .sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || ""));

  const handleDeclineOpen = (appt: any) => {
    setDeclineModal({ open: true, appointment: appt, reason: '' });
  };

  const handleDeclineConfirm = () => {
    if (declineModal.appointment) {
      onDecline(declineModal.appointment, declineModal.reason);
      setDeclineModal({ open: false, appointment: null, reason: '' });
    }
  };

  return (
    <>
      <Card className="flex flex-col h-[calc(100vh-12rem)] shadow-xl border-none rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white pb-6">
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Daily Agenda
            </CardTitle>
            <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase">
              {filteredAppointments.length} Booked
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by plate or name..."
              className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-slate-400 h-10 rounded-xl"
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-6 space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="text-slate-300 w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Clear Schedule
              </p>
            </div>
          ) : (
            filteredAppointments.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt}>
                <CustomerCard customerId={appt.customerId} />
                <VehicleCard vehicleId={appt.vehicleId} customerId={appt.customerId} />
                {appt.services && appt.services.length > 0 ? (
                  appt.services.map((service: any) => (
                    <ServiceCard key={service.id} serviceId={service.id} />
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No services selected.
                  </div>
                )}
                <StaffCards appointmentId={appt.id} />
                {appt.status === "PENDING" && (
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
            ))
          )}
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={declineModal.open} onOpenChange={(open) => setDeclineModal({ ...declineModal, open })}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Decline Appointment
            </DialogTitle>
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