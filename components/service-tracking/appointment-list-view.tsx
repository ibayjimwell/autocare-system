'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';
import StaffCards from '@/components/staffs/staff-cards';
import EmptyState from '@/components/shared/empty-state';
import ConfirmationDialog from '@/components/shared/confimation-dialog';
import {
  Eye,
  Play,
  ArrowRight,
  Search,
  ArrowUp,
  ArrowDown,
  Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FILTER_OPTIONS, SORT_OPTIONS, SortField } from '@/app-utils/service-tracking/constants';

interface AppointmentListViewProps {
  activeFilter: string;
  setActiveFilter: (val: string) => void;
  search: string;
  setSearch: (val: string) => void;
  sortField: SortField;
  setSortField: (val: SortField) => void;
  sortDirection: "asc" | "desc";
  setSortDirection: (dir: "asc" | "desc") => void;
  filteredAppointments: any[];
  handleInspect: (appt: any) => void;
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: (open: boolean) => void;
  pendingAppointment: any;
  handleConfirmStartInspection: () => void;
}

export default function AppointmentListView({
  activeFilter,
  setActiveFilter,
  search,
  setSearch,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  filteredAppointments,
  handleInspect,
  confirmDialogOpen,
  setConfirmDialogOpen,
  pendingAppointment,
  handleConfirmStartInspection,
}: AppointmentListViewProps) {
  return (
    <>
      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
        <div className="overflow-x-auto no-scrollbar">
          <div className="inline-flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setActiveFilter(opt.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap",
                    isActive
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5 scale-100"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50 scale-95"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-slate-400")} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

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
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Appointments Grid */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No active jobs"
          description={
            search.trim()
              ? "No appointments match your search criteria."
              : `No appointments marked as ${FILTER_OPTIONS.find(f => f.value === activeFilter)?.label.toLowerCase()}.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAppointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              className="h-full"
            >
              <div className="space-y-3">
                <CustomerCard customerId={appt.customerId} />
                <VehicleCard
                  vehicleId={appt.vehicleId}
                  customerId={appt.customerId}
                />
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
                <Button
                  className={cn(
                    "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                    appt.status === "CONFIRMED"
                      ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      : "bg-slate-900 hover:bg-black text-white"
                  )}
                  onClick={() => handleInspect(appt)}
                >
                  {appt.status === "CONFIRMED" ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" /> Start Inspection
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" /> Continue Work
                    </>
                  )}
                  <ArrowRight className="w-4 h-4 ml-auto opacity-50" />
                </Button>
              </div>
            </AppointmentCard>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Starting Inspection */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Start Inspection"
        description={`Begin inspection for ${pendingAppointment?.vehicle?.make || "Unknown"} ${pendingAppointment?.vehicle?.model || ""} (${pendingAppointment?.vehicle?.plateNumber || "N/A"})?`}
        onConfirm={handleConfirmStartInspection}
        confirmText="Confirm & Start"
      />
    </>
  );
}