'use client';

import React, { useState, useEffect, useMemo } from 'react';

import PageContainer from '@/components/shared/page-container';
import LoadingSpinner from '@/components/shared/loading-spinner';
import StatusBadge from '@/components/shared/status-badge';
import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';

import {
  ArrowLeft,
  Car,
  CalendarDays,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  History,
  Info,
  Pencil,
  Trash2,
  Clock,
  GitCommit,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { cn } from '@/lib/utils';
import { vehiclesApi } from '@/lib/customers/vehicles';
import { appointmentsApi } from '@/lib/appointments/appointments';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import AppointmentCard from '@/components/appointments/appointment-card';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  deactivated?: boolean;
}

interface HistoryEntry {
  id: string;
  appointmentId: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  appointment: any;
  staff?: { fullname: string } | null;
}

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
}

export default function CustomerDetail({
  customer,
  onBack,
}: CustomerDetailProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vSearch, setVSearch] = useState('');
  const [vPage, setVPage] = useState(1);

  const itemsPerPage = 5;

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] =
    useState<Vehicle | null>(null);

  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: '',
  });

  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleFormErrors, setVehicleFormErrors] = useState<any>({});
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    vehicleId: null as string | null,
    vehicleName: '',
  });

  const [apiError, setApiError] = useState<any>(null);

  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<any>(null);

  const loadVehicles = async () => {
    setLoading(true);
    setApiError(null);

    try {
      const res = await vehiclesApi.list(customer.id);

      if (res.error) {
        setApiError({
          type: res.errorType || 'fe',
          title: res.errorTitle || 'Error',
          message:
            res.errorMessage || 'Failed to load vehicles.',
        });

        setVehicles([]);
      } else {
        setVehicles(res.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [customer.id]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await appointmentsApi.getHistoryForCustomer(
        customer.id
      );

      if (res.error) {
        setHistoryError({
          type: res.errorType || 'fe',
          title: res.errorTitle || 'Error',
          message:
            res.errorMessage || 'Failed to load history.',
        });

        setHistoryData([]);
      } else {
        setHistoryData(res.data || []);
      }
    } catch (err: any) {
      setHistoryError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [customer.id]);

  const groupedHistory = useMemo(() => {
    const map = new Map<string, Map<string, HistoryEntry[]>>();

    for (const entry of historyData) {
      const date = format(
        parseISO(entry.createdAt),
        'yyyy-MM-dd'
      );

      if (!map.has(date)) {
        map.set(date, new Map());
      }

      const dayMap = map.get(date)!;
      const apptId = entry.appointmentId;

      if (!dayMap.has(apptId)) {
        dayMap.set(apptId, []);
      }

      dayMap.get(apptId)!.push(entry);
    }

    const sortedEntries = Array.from(map.entries()).sort(
      (a, b) => b[0].localeCompare(a[0])
    );

    return sortedEntries;
  }, [historyData]);

  const filteredVehicles = vehicles.filter((v) =>
    `${v.make} ${v.model} ${v.plateNumber}`
      .toLowerCase()
      .includes(vSearch.toLowerCase())
  );

  const vTotalPages = Math.ceil(
    filteredVehicles.length / itemsPerPage
  );

  const paginatedVehicles = filteredVehicles.slice(
    (vPage - 1) * itemsPerPage,
    vPage * itemsPerPage
  );

  useEffect(() => {
    setVPage(1);
  }, [vSearch]);

  const openCreateVehicle = () => {
    setEditingVehicle(null);

    setVehicleForm({
      plateNumber: '',
      make: '',
      model: '',
      year: '',
    });

    setVehicleFormErrors({});
    setApiError(null);
    setVehicleModalOpen(true);
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);

    setVehicleForm({
      plateNumber: vehicle.plateNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year ? String(vehicle.year) : '',
    });

    setVehicleFormErrors({});
    setApiError(null);
    setVehicleModalOpen(true);
  };

  const validateVehicleForm = () => {
    const errors: any = {};

    if (!vehicleForm.plateNumber.trim()) {
      errors.plateNumber = 'Plate number is required.';
    }

    if (!vehicleForm.make.trim()) {
      errors.make = 'Make is required.';
    }

    if (!vehicleForm.model.trim()) {
      errors.model = 'Model is required.';
    }

    if (
      vehicleForm.year &&
      (isNaN(Number(vehicleForm.year)) ||
        Number(vehicleForm.year) < 1900 ||
        Number(vehicleForm.year) >
          new Date().getFullYear() + 1)
    ) {
      errors.year =
        'Year must be a valid year (1900 - next year).';
    }

    setVehicleFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateVehicleForm()) return;

    setSavingVehicle(true);
    setApiError(null);

    const payload = {
      plateNumber: vehicleForm.plateNumber.trim(),
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      year: vehicleForm.year ? Number(vehicleForm.year) : null,
    };

    try {
      let res;

      if (editingVehicle) {
        res = await vehiclesApi.update(
          customer.id,
          editingVehicle.id,
          payload
        );
      } else {
        res = await vehiclesApi.create(customer.id, payload);
      }

      if (res.error) {
        setApiError({
          type: res.errorType || 'fve',
          title: res.errorTitle || 'Error',
          message:
            res.errorMessage || 'Operation failed.',
        });
      } else {
        toast.success(
          editingVehicle
            ? 'Vehicle updated.'
            : 'Vehicle added.'
        );

        setVehicleModalOpen(false);
        await loadVehicles();
      }
    } catch (err: any) {
      setApiError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setSavingVehicle(false);
    }
  };

  const confirmDelete = (
    vehicleId: string,
    vehicleName: string
  ) => {
    setDeleteDialog({
      open: true,
      vehicleId,
      vehicleName,
    });
  };

  const handleDeleteVehicle = async () => {
    if (!deleteDialog.vehicleId) return;

    try {
      const res = await vehiclesApi.delete(
        customer.id,
        deleteDialog.vehicleId
      );

      if (res.error) {
        toast.error(
          res.errorMessage || 'Failed to delete vehicle.'
        );
      } else {
        toast.success('Vehicle deleted successfully.');
        await loadVehicles();
      }
    } catch (err: any) {
      toast.error(
        err.message || 'Error deleting vehicle.'
      );
    } finally {
      setDeleteDialog({
        open: false,
        vehicleId: null,
        vehicleName: '',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <PageContainer
      title={customer.fullname}
      subtitle="Customer Profile & Asset Management"
      actions={
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="
            h-11 rounded-md px-4 text-sm font-medium
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
            md:h-9
          "
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
          Back to List
        </Button>
      }
    >
      {/* Customer summary */}
      <Card className="mb-5 overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-4 md:p-5 lg:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm md:h-16 md:w-16 md:text-2xl">
                {customer.fullname.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {customer.fullname}
                  </h2>

                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px]',
                      customer.deactivated
                        ? 'border-destructive/20 bg-destructive/10 text-destructive'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {customer.deactivated
                      ? 'Deactivated'
                      : 'Active'}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </span>

                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{customer.phone}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile
                </p>

                <p className="mt-0.5 text-xs font-medium text-foreground">
                  Customer record
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      <Tabs
        defaultValue="vehicles"
        className="w-full space-y-5"
      >
        <div className="overflow-x-auto">
          <TabsList
            className="
              inline-grid h-11 min-w-full grid-cols-2
              rounded-lg bg-muted p-1
              md:min-w-0
            "
          >
            <TabsTrigger
              value="vehicles"
              className="
                gap-1.5 rounded-md px-4
                text-xs font-medium
                data-[state=active]:bg-card
                data-[state=active]:text-foreground
                data-[state=active]:shadow-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:text-sm
              "
            >
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">
                Registered Vehicles
              </span>
              <span className="sm:hidden">Vehicles</span>
            </TabsTrigger>

            <TabsTrigger
              value="appointments"
              className="
                gap-1.5 rounded-md px-4
                text-xs font-medium
                data-[state=active]:bg-card
                data-[state=active]:text-foreground
                data-[state=active]:shadow-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:text-sm
              "
            >
              <History className="h-4 w-4" />

              <span className="hidden sm:inline">
                Appointments History
              </span>

              <span className="sm:hidden">History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Vehicles */}
        <TabsContent
          value="vehicles"
          className="animate-in space-y-4 slide-in-from-bottom-4 duration-500"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />

                <Input
                  placeholder="Find specific vehicle..."
                  value={vSearch}
                  onChange={(e) => {
                    setVSearch(e.target.value);
                  }}
                  className="
                    h-11 rounded-md pl-11 text-base
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-1
                    md:h-9 md:pl-10 md:text-sm
                  "
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={openCreateVehicle}
              className="
                h-11 w-full rounded-md px-4
                text-base font-medium shadow-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9 md:w-auto md:px-3 md:text-sm
              "
            >
              <Plus className="h-5 w-5 md:h-4 md:w-4" />
              Add Vehicle
            </Button>
          </div>

          <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border bg-muted/20 px-4 py-3 md:px-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Registered vehicles
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filteredVehicles.length} vehicle
                  {filteredVehicles.length === 1 ? '' : 's'}
                </p>
              </div>

              {filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center md:py-16">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Car className="h-7 w-7 text-muted-foreground/60" />
                  </div>

                  <p className="text-sm font-medium text-foreground">
                    No registered vehicles found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {vSearch
                      ? 'Try a different search term.'
                      : 'Add a vehicle to this customer profile.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {paginatedVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="
                          flex flex-col gap-3 p-4
                          transition-colors
                          hover:bg-muted/20
                          sm:flex-row sm:items-center
                          sm:justify-between
                          md:px-5
                        "
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary">
                            <Car className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {v.make} {v.model}
                            </p>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Year: {v.year || 'N/A'}
                              </span>

                              <span className="rounded-md border border-primary/10 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Plate: {v.plateNumber}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditVehicle(v)}
                            aria-label={`Edit ${v.make} ${v.model}`}
                            className="
                              h-9 w-9 rounded-md
                              text-muted-foreground hover:text-foreground
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              confirmDelete(
                                v.id,
                                `${v.make} ${v.model} (${v.plateNumber})`
                              )
                            }
                            aria-label={`Delete ${v.make} ${v.model}`}
                            className="
                              h-9 w-9 rounded-md
                              text-destructive
                              hover:bg-destructive/10
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                            "
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {vTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 border-t border-border bg-muted/20 p-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setVPage((p) => Math.max(1, p - 1))
                        }
                        disabled={vPage === 1}
                        aria-label="Previous page"
                        className="
                          h-9 w-9 rounded-md
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-xs font-semibold text-muted-foreground">
                        Page {vPage} of {vTotalPages}
                      </span>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setVPage((p) =>
                            Math.min(vTotalPages, p + 1)
                          )
                        }
                        disabled={vPage === vTotalPages}
                        aria-label="Next page"
                        className="
                          h-9 w-9 rounded-md
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment History */}
        <TabsContent
          value="appointments"
          className="animate-in space-y-6 slide-in-from-bottom-4 duration-500"
        >
          {historyLoading ? (
            <LoadingSpinner />
          ) : historyError ? (
            <div className="mb-4">
              <ErrorHandler
                type={historyError.type}
                title={historyError.title}
                message={historyError.message}
              />
            </div>
          ) : groupedHistory.length === 0 ? (
            <Card className="rounded-xl border-border bg-card shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
                </div>

                <p className="text-sm font-medium text-foreground">
                  No appointment history
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  No appointment history was found for this customer.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 md:space-y-10">
              {groupedHistory.map(
                ([date, appointmentsMap]) => (
                  <div key={date}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />

                      <h3 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {format(
                          parseISO(date),
                          'MMMM dd, yyyy'
                        )}
                      </h3>

                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4">
                      {Array.from(
                        appointmentsMap.entries()
                      ).map(
                        ([appointmentId, entries]) => {
                          const apptData =
                            entries[0]?.appointment;

                          if (!apptData) return null;

                          const sortedEntries = [
                            ...entries,
                          ].sort(
                            (a, b) =>
                              new Date(
                                a.createdAt
                              ).getTime() -
                              new Date(
                                b.createdAt
                              ).getTime()
                          );

                          return (
                            <div
                              key={appointmentId}
                              className="w-[320px] shrink-0 snap-start sm:w-[360px] md:max-w-[400px]"
                            >
                              <AppointmentCard
                                appointment={apptData}
                                className="mb-3"
                              >
                                <CustomerCard
                                  customerId={
                                    apptData.customerId
                                  }
                                />

                                <VehicleCard
                                  vehicleId={
                                    apptData.vehicleId
                                  }
                                  customerId={
                                    apptData.customerId
                                  }
                                />

                                {apptData.services?.map(
                                  (service: any) => (
                                    <ServiceCard
                                      key={service.id}
                                      serviceId={service.id}
                                    />
                                  )
                                )}
                              </AppointmentCard>

                              <div className="ml-4 space-y-2 border-l-2 border-border pl-6">
                                {sortedEntries.map(
                                  (entry) => (
                                    <div
                                      key={entry.id}
                                      className="relative flex items-start gap-3 pb-2 last:pb-0"
                                    >
                                      <div className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-sm" />

                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <StatusBadge
                                            status={
                                              entry.toStatus
                                            }
                                            className="text-[10px]"
                                          />

                                          {entry.fromStatus && (
                                            <span className="text-[10px] text-muted-foreground">
                                              from{' '}
                                              <StatusBadge
                                                status={
                                                  entry.fromStatus
                                                }
                                                className="inline-block text-[10px]"
                                              />
                                            </span>
                                          )}

                                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {format(
                                              parseISO(
                                                entry.createdAt
                                              ),
                                              'h:mm a'
                                            )}
                                          </span>
                                        </div>

                                        {entry.staff && (
                                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <GitCommit className="h-3 w-3" />
                                            Changed by{' '}
                                            <strong className="text-foreground">
                                              {
                                                entry.staff
                                                  .fullname
                                              }
                                            </strong>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vehicle Form Modal */}
      <DataModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        title={
          editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'
        }
        onSubmit={handleSaveVehicle}
        isLoading={savingVehicle}
      >
        <div className="space-y-4">
          {apiError && (
            <ErrorHandler
              type={apiError.type}
              title={apiError.title}
              message={apiError.message}
            />
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground">
              Vehicle information
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Keep the vehicle record aligned with the customer's
              service history.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Plate Number
            </Label>

            <Input
              value={vehicleForm.plateNumber}
              onChange={(e) => {
                setVehicleForm({
                  ...vehicleForm,
                  plateNumber: e.target.value,
                });

                if (vehicleFormErrors.plateNumber) {
                  setVehicleFormErrors({
                    ...vehicleFormErrors,
                    plateNumber: undefined,
                  });
                }
              }}
              className={cn(
                'h-11 rounded-md text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-sm',
                vehicleFormErrors.plateNumber &&
                  'border-destructive'
              )}
              placeholder="ABC-1234"
            />

            {vehicleFormErrors.plateNumber && (
              <p className="text-xs font-medium text-destructive">
                {vehicleFormErrors.plateNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Make
              </Label>

              <Input
                value={vehicleForm.make}
                onChange={(e) => {
                  setVehicleForm({
                    ...vehicleForm,
                    make: e.target.value,
                  });

                  if (vehicleFormErrors.make) {
                    setVehicleFormErrors({
                      ...vehicleFormErrors,
                      make: undefined,
                    });
                  }
                }}
                className={cn(
                  'h-11 rounded-md text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-sm',
                  vehicleFormErrors.make &&
                    'border-destructive'
                )}
                placeholder="Toyota"
              />

              {vehicleFormErrors.make && (
                <p className="text-xs font-medium text-destructive">
                  {vehicleFormErrors.make}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Model
              </Label>

              <Input
                value={vehicleForm.model}
                onChange={(e) => {
                  setVehicleForm({
                    ...vehicleForm,
                    model: e.target.value,
                  });

                  if (vehicleFormErrors.model) {
                    setVehicleFormErrors({
                      ...vehicleFormErrors,
                      model: undefined,
                    });
                  }
                }}
                className={cn(
                  'h-11 rounded-md text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-sm',
                  vehicleFormErrors.model &&
                    'border-destructive'
                )}
                placeholder="Camry"
              />

              {vehicleFormErrors.model && (
                <p className="text-xs font-medium text-destructive">
                  {vehicleFormErrors.model}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Year (optional)
            </Label>

            <Input
              value={vehicleForm.year}
              onChange={(e) => {
                setVehicleForm({
                  ...vehicleForm,
                  year: e.target.value,
                });

                if (vehicleFormErrors.year) {
                  setVehicleFormErrors({
                    ...vehicleFormErrors,
                    year: undefined,
                  });
                }
              }}
              className={cn(
                'h-11 rounded-md text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:h-9 md:text-sm',
                vehicleFormErrors.year &&
                  'border-destructive'
              )}
              placeholder="e.g., 2020"
            />

            {vehicleFormErrors.year && (
              <p className="text-xs font-medium text-destructive">
                {vehicleFormErrors.year}
              </p>
            )}
          </div>
        </div>
      </DataModal>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            ...deleteDialog,
            open,
          })
        }
      >
        <AlertDialogContent
          className="
            rounded-xl p-5 shadow-xl
            sm:max-w-md md:p-6
          "
        >
          <AlertDialogHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>

              <div>
                <AlertDialogTitle className="text-lg font-semibold text-foreground">
                  Delete Vehicle
                </AlertDialogTitle>

                <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  You are about to delete{' '}
                  <strong className="text-foreground">
                    {deleteDialog.vehicleName}
                  </strong>
                  . This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel
              className="
                h-11 w-full rounded-md px-4 font-medium
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                sm:w-auto md:h-9
              "
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="
                h-11 w-full rounded-md bg-destructive
                px-4 font-medium text-destructive-foreground
                hover:bg-destructive/90
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                sm:w-auto md:h-9
              "
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}