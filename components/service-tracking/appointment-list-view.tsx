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
import FutureAppointmentsDrawer from '@/components/service-tracking/FutureAppointmentsDrawer';

import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  CalendarDays,
  Car,
  Eye,
  ListFilter,
  Play,
  Search,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  FILTER_OPTIONS,
  SORT_OPTIONS,
  SortField,
} from '@/app-utils/service-tracking/constants';

interface AppointmentListViewProps {
  activeFilter: string;
  setActiveFilter: (val: string) => void;
  search: string;
  setSearch: (val: string) => void;
  sortField: SortField;
  setSortField: (val: SortField) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
  filteredAppointments: any[];
  handleInspect: (appt: any) => void;
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: (open: boolean) => void;
  pendingAppointment: any;
  handleConfirmStartInspection: () => void;
  futureAppointments: any[];
  loadFutureAppointments: () => void;
  futureDrawerOpen: boolean;
  setFutureDrawerOpen: (open: boolean) => void;
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
  futureAppointments,
  loadFutureAppointments,
  futureDrawerOpen,
  setFutureDrawerOpen,
}: AppointmentListViewProps) {
  return (
    <>
      <div className="w-full space-y-5">
        {/* ---------------------------------------------------------
         * FILTER / SEARCH TOOLBAR
         * ------------------------------------------------------- */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {/* Filter tabs */}
            <div className="w-full overflow-x-auto no-scrollbar">
              <div
                className="inline-flex min-w-max rounded-lg border border-border bg-muted p-1"
                role="tablist"
                aria-label="Appointment status filter"
              >
                {FILTER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = activeFilter === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveFilter(opt.value)}
                      className={cn(
                        'flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'md:min-h-9 md:px-3 md:text-xs',
                        isActive
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-background text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              {/* Future appointments */}
              <div className="flex min-w-0">
                {activeFilter === 'CONFIRMED' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      loadFutureAppointments();
                      setFutureDrawerOpen(true);
                    }}
                    className={cn(
                      'h-11 w-full rounded-md px-4 sm:w-auto md:h-9',
                      'border-primary/30 text-primary hover:bg-primary/5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Future Appointments
                  </Button>
                )}
              </div>

              {/* Search / sorting */}
              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                {/* Search */}
                <div className="relative w-full sm:w-[280px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    placeholder="Search customer, vehicle, tracking..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      'h-11 rounded-md pl-10 text-base md:h-9 md:text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  />
                </div>

                {/* Sort */}
                <div className="flex gap-2">
                  <Select
                    value={sortField}
                    onValueChange={(val) =>
                      setSortField(val as SortField)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        'h-11 min-w-0 flex-1 rounded-md text-base md:h-9 md:w-[170px] md:flex-none md:text-sm',
                        'focus:ring-2 focus:ring-ring focus:ring-offset-2'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort by" />
                      </div>
                    </SelectTrigger>

                    <SelectContent className="rounded-lg">
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={
                      sortDirection === 'asc'
                        ? 'Sort descending'
                        : 'Sort ascending'
                    }
                    onClick={() =>
                      setSortDirection(
                        sortDirection === 'asc' ? 'desc' : 'asc'
                      )
                    }
                    className={cn(
                      'h-11 w-11 shrink-0 rounded-md md:h-9 md:w-9',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    {sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------
         * APPOINTMENTS
         * ------------------------------------------------------- */}
        {filteredAppointments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={Car}
                title="No active jobs"
                description={
                  search.trim()
                    ? 'No appointments match your search criteria.'
                    : `No ${
                        activeFilter === 'CONFIRMED'
                          ? "today's confirmed"
                          : FILTER_OPTIONS.find(
                              (f) =>
                                f.value === activeFilter
                            )?.label?.toLowerCase()
                      } appointments.`
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAppointments.map((appt) => {
              const isConfirmed = appt.status === 'CONFIRMED';

              return (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  className={cn(
                    'h-full overflow-hidden rounded-xl',
                    'border border-border bg-card shadow-sm',
                    'transition-shadow duration-200 hover:shadow-md'
                  )}
                >
                  <div className="flex h-full flex-col">
                    {/* Appointment summary */}
                    <div className="border-b border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {appt.customer?.fullname ||
                              appt.customerName ||
                              'Customer'}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {appt.vehicle?.plateNumber ||
                                appt.vehiclePlate ||
                                'N/A'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                            isConfirmed
                              ? 'border-primary/20 bg-primary/5 text-primary'
                              : 'border-border bg-muted text-muted-foreground'
                          )}
                        >
                          {isConfirmed ? 'Ready' : 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Appointment information */}
                    <div className="flex-1 space-y-3 p-4">
                      <CustomerCard
                        customerId={appt.customerId}
                      />

                      <VehicleCard
                        vehicleId={appt.vehicleId}
                        customerId={appt.customerId}
                      />

                      {appt.services &&
                      appt.services.length > 0 ? (
                        <div className="space-y-2">
                          {appt.services.map(
                            (service: any) => (
                              <ServiceCard
                                key={service.id}
                                serviceId={service.id}
                              />
                            )
                          )}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            No services selected.
                          </p>
                        </div>
                      )}

                      <StaffCards
                        appointmentId={appt.id}
                      />
                    </div>

                    {/* Action */}
                    <div className="border-t border-border p-4">
                      <Button
                        type="button"
                        onClick={() => handleInspect(appt)}
                        className={cn(
                          'h-11 w-full justify-between rounded-md px-4 md:h-9',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isConfirmed
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-foreground text-background hover:bg-foreground/90'
                        )}
                      >
                        <span className="flex items-center">
                          {isConfirmed ? (
                            <Eye className="mr-2 h-4 w-4" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}

                          <span className="text-xs font-semibold">
                            {isConfirmed
                              ? 'Start Inspection'
                              : 'Continue Work'}
                          </span>
                        </span>

                        <ArrowRight className="h-4 w-4 opacity-70" />
                      </Button>
                    </div>
                  </div>
                </AppointmentCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------
       * CONFIRMATION DIALOG
       * ------------------------------------------------------- */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Start Inspection"
        description={`Begin inspection for ${
          pendingAppointment?.vehicle?.make ||
          'Unknown'
        } ${
          pendingAppointment?.vehicle?.model || ''
        } (${
          pendingAppointment?.vehicle?.plateNumber ||
          'N/A'
        })?`}
        onConfirm={handleConfirmStartInspection}
        confirmText="Confirm & Start"
      />

      {/* ---------------------------------------------------------
       * FUTURE APPOINTMENTS
       * ------------------------------------------------------- */}
      <FutureAppointmentsDrawer
        open={futureDrawerOpen}
        onOpenChange={setFutureDrawerOpen}
        appointments={futureAppointments}
        onInspect={handleInspect}
      />
    </>
  );
}