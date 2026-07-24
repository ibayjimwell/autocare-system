// app/service-tracking/page.tsx
'use client';

import React from 'react';
import PageContainer from '@/components/shared/page-container';
import ServiceTrackingSkeleton from '@/components/skeleton/service-tracking-skeleton';
import ServiceDetailPanel from '@/components/service-tracking/service-detail-panel';
import QueueList from '@/components/queue/QueueList';
import AppointmentGrid from '@/components/service-tracking/AppointmentGrid';
import { useAppointmentList } from '@/hooks/service-tracking/useAppointmentList';
import { useServiceQueue } from '@/hooks/queue/useServiceQueue';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import {
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { SORT_OPTIONS, SortField } from '@/app-utils/service-tracking/constants';
import ConfirmationDialog from '@/components/shared/confimation-dialog';
import FutureAppointmentsDrawer from '@/components/service-tracking/FutureAppointmentsDrawer';

export default function ServiceTrackingPage() {
  const {
    initialLoading: listLoading,
    selectedAppointment,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAppointment,
    handleInspect,
    handleConfirmStartInspection,
    handleBack,
    filteredAppointments,
    loadAppointments,
    futureAppointments,
    loadFutureAppointments,
    futureDrawerOpen,
    setFutureDrawerOpen,
  } = useAppointmentList();

  // Enable the queue hook only when on the "Confirmed" tab (today's appointments)
  const isToday = activeFilter === 'CONFIRMED';
  const { queue, loading: queueLoading, moveUp, moveDown, reorder, loadQueue } = useServiceQueue(isToday);

  const handleStartInspectionFromQueue = async (appointmentId: string) => {
    try {
      const res = await appointmentsApi.updateStatus(appointmentId, 'UNDER_INSPECTION');
      if (res.error) {
        toast.error(res.errorMessage || 'Failed to start inspection.');
      } else {
        toast.success('Inspection started!');
        // Real-time will refresh the queue automatically; we still refresh the appointment list
        loadAppointments();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error starting inspection.');
    }
  };

  if (listLoading) {
    return (
      <PageContainer
        title="Service Tracking"
        subtitle="Monitor and manage real‑time workshop operations"
      >
        <ServiceTrackingSkeleton />
      </PageContainer>
    );
  }

  if (selectedAppointment) {
    return (
      <ServiceDetailPanel
        appointment={selectedAppointment}
        onBack={handleBack}
        onStatusChanged={loadAppointments}
      />
    );
  }

  return (
    <PageContainer
      title="Service Tracking"
      subtitle="Monitor and manage real‑time workshop operations"
    >
      {/* ---------- Shared Filter Bar ---------- */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
              {[
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'UNDER_INSPECTION', label: 'Under Inspection' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
              ].map((opt) => {
                const isActive = activeFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setActiveFilter(opt.value)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap',
                      isActive
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5 scale-100'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Future Appointments Button – only on CONFIRMED tab */}
          {isToday && (
            <Button
              variant="outline"
              className="rounded-2xl border-dashed border-primary/50 text-primary hover:bg-primary/5 h-10"
              onClick={() => {
                loadFutureAppointments();
                setFutureDrawerOpen(true);
              }}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Future Appointments
            </Button>
          )}
        </div>

        {/* Search & Sort – only for non‑CONFIRMED tabs */}
        {!isToday && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customer, vehicle, tracking..."
                className="pl-10 rounded-xl border-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortField}
                onValueChange={(val) => setSortField(val as SortField)}
              >
                <SelectTrigger className="w-[160px] h-9 rounded-xl border-slate-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-200"
                onClick={() =>
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                }
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Content ---------- */}
      {isToday ? (
        <QueueList
          queue={queue}
          loading={queueLoading}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onStartInspection={handleStartInspectionFromQueue}
        />
      ) : (
        <AppointmentGrid
          appointments={filteredAppointments}
          search={search}
          activeFilter={activeFilter}
          handleInspect={handleInspect}
        />
      )}

      {/* ---------- Common Dialogs & Drawer ---------- */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Start Inspection"
        description={`Begin inspection for ${pendingAppointment?.vehicle?.make || 'Unknown'} ${pendingAppointment?.vehicle?.model || ''} (${pendingAppointment?.vehicle?.plateNumber || 'N/A'})?`}
        onConfirm={handleConfirmStartInspection}
        confirmText="Confirm & Start"
      />

      <FutureAppointmentsDrawer
        open={futureDrawerOpen}
        onOpenChange={setFutureDrawerOpen}
        appointments={futureAppointments}
        onInspect={handleInspect}
      />
    </PageContainer>
  );
}