'use client';

import React, { useState, useEffect, useMemo } from "react";
import PageContainer from "@/components/shared/page-container";
import LoadingSpinner from "@/components/shared/loading-spinner";
import StatusBadge from "@/components/shared/status-badge";
import DataModal from "@/components/shared/data-modal";
import ErrorHandler from "@/components/shared/error-handler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
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
  User,
  History,
  Info,
  Pencil,
  Trash2,
  Clock,
  GitCommit,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { vehiclesApi } from "@/lib/customers/vehicles";
import { appointmentsApi } from "@/lib/appointments/appointments";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppointmentCard from "@/components/appointments/appointment-card";
import CustomerCard from "@/components/customers/customer-card";
import VehicleCard from "@/components/customers/vehicle-card";
import ServiceCard from "@/components/services/service-card";

// Types
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

export default function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  // ========== Vehicles state ==========
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vSearch, setVSearch] = useState("");
  const [vPage, setVPage] = useState(1);
  const itemsPerPage = 5;
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ plateNumber: "", make: "", model: "", year: "" });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleFormErrors, setVehicleFormErrors] = useState<any>({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, vehicleId: null as string | null, vehicleName: "" });
  const [apiError, setApiError] = useState<any>(null);

  // ========== Appointments History state ==========
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<any>(null);

  // ========== Load Vehicles ==========
  const loadVehicles = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await vehiclesApi.list(customer.id);
      if (res.error) {
        setApiError({ type: res.errorType || "fe", title: res.errorTitle || "Error", message: res.errorMessage || "Failed to load vehicles." });
        setVehicles([]);
      } else {
        setVehicles(res.data || []);
      }
    } catch (err: any) {
      setApiError({ type: "se", title: "Unexpected Error", message: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [customer.id]);

  // ========== Load Appointment History ==========
  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await appointmentsApi.getHistoryForCustomer(customer.id);
      if (res.error) {
        setHistoryError({ type: res.errorType || "fe", title: "Error", message: res.errorMessage || "Failed to load history." });
        setHistoryData([]);
      } else {
        setHistoryData(res.data || []);
      }
    } catch (err: any) {
      setHistoryError({ type: "se", title: "Unexpected Error", message: err.message || "Something went wrong." });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [customer.id]);

  // ========== Group history by date and then by appointment ==========
  const groupedHistory = useMemo(() => {
    const map = new Map<string, Map<string, HistoryEntry[]>>();
    for (const entry of historyData) {
      const date = format(parseISO(entry.createdAt), "yyyy-MM-dd");
      if (!map.has(date)) map.set(date, new Map());
      const dayMap = map.get(date)!;
      const apptId = entry.appointmentId;
      if (!dayMap.has(apptId)) dayMap.set(apptId, []);
      dayMap.get(apptId)!.push(entry);
    }
    // Sort dates descending
    const sortedEntries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return sortedEntries;
  }, [historyData]);

  // ========== Vehicle helpers ==========
  const filteredVehicles = vehicles.filter((v) =>
    `${v.make} ${v.model} ${v.plateNumber}`.toLowerCase().includes(vSearch.toLowerCase())
  );
  const vTotalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = filteredVehicles.slice((vPage - 1) * itemsPerPage, vPage * itemsPerPage);

  useEffect(() => { setVPage(1); }, [vSearch]);

  const openCreateVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({ plateNumber: "", make: "", model: "", year: "" });
    setVehicleFormErrors({});
    setApiError(null);
    setVehicleModalOpen(true);
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      plateNumber: vehicle.plateNumber || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year ? String(vehicle.year) : "",
    });
    setVehicleFormErrors({});
    setApiError(null);
    setVehicleModalOpen(true);
  };

  const validateVehicleForm = () => {
    const errors: any = {};
    if (!vehicleForm.plateNumber.trim()) errors.plateNumber = "Plate number is required.";
    if (!vehicleForm.make.trim()) errors.make = "Make is required.";
    if (!vehicleForm.model.trim()) errors.model = "Model is required.";
    if (vehicleForm.year && (isNaN(Number(vehicleForm.year)) || Number(vehicleForm.year) < 1900 || Number(vehicleForm.year) > new Date().getFullYear() + 1)) {
      errors.year = "Year must be a valid year (1900 - next year).";
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
        res = await vehiclesApi.update(customer.id, editingVehicle.id, payload);
      } else {
        res = await vehiclesApi.create(customer.id, payload);
      }
      if (res.error) {
        setApiError({ type: res.errorType || "fve", title: res.errorTitle || "Error", message: res.errorMessage || "Operation failed." });
      } else {
        toast.success(editingVehicle ? "Vehicle updated." : "Vehicle added.");
        setVehicleModalOpen(false);
        await loadVehicles();
      }
    } catch (err: any) {
      setApiError({ type: "se", title: "Unexpected Error", message: err.message || "Something went wrong." });
    } finally {
      setSavingVehicle(false);
    }
  };

  const confirmDelete = (vehicleId: string, vehicleName: string) => {
    setDeleteDialog({ open: true, vehicleId, vehicleName });
  };

  const handleDeleteVehicle = async () => {
    if (!deleteDialog.vehicleId) return;
    try {
      const res = await vehiclesApi.delete(customer.id, deleteDialog.vehicleId);
      if (res.error) {
        toast.error(res.errorMessage || "Failed to delete vehicle.");
      } else {
        toast.success("Vehicle deleted successfully.");
        await loadVehicles();
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting vehicle.");
    } finally {
      setDeleteDialog({ open: false, vehicleId: null, vehicleName: "" });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      title={customer.fullname}
      subtitle="Customer Profile & Asset Management"
      actions={
        <Button variant="ghost" onClick={onBack} className="rounded-xl hover:bg-slate-100 transition-all font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      }
    >
      {/* Customer Info Header */}
      <Card className="mb-8 border-none shadow-sm bg-gradient-to-r from-slate-50 to-white overflow-hidden animate-in fade-in duration-500">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black shadow-lg">
              {customer.fullname.charAt(0)}
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{customer.fullname}</h2>
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-100">
                  <Mail className="w-3.5 h-3.5 mr-2 text-primary" /> {customer.email}
                </span>
                <span className="flex items-center text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-100">
                  <Phone className="w-3.5 h-3.5 mr-2 text-primary" /> {customer.phone}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {apiError && <div className="mb-4"><ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} /></div>}

      <Tabs defaultValue="vehicles" className="w-full space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-2 md:inline-flex">
          <TabsTrigger value="vehicles" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold px-8 transition-all">
            <Car className="w-4 h-4 mr-2" /> Registered Vehicles
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold px-8 transition-all">
            <History className="w-4 h-4 mr-2" /> Appointments History
          </TabsTrigger>
        </TabsList>

        {/* ===== Vehicles Tab (unchanged) ===== */}
        <TabsContent value="vehicles" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Find specific vehicle..."
                className="pl-10 h-11 rounded-xl bg-white border-slate-200 focus:ring-primary"
                value={vSearch}
                onChange={(e) => { setVSearch(e.target.value); }}
              />
            </div>
            <Button
              onClick={openCreateVehicle}
              className="w-full md:w-auto h-11 px-6 rounded-xl font-bold shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </Button>
          </div>

          <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="text-slate-300 w-8 h-8" />
                  </div>
                  <p className="text-slate-500 font-medium">No registered vehicles found</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-50">
                    {paginatedVehicles.map((v) => (
                      <div key={v.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 p-3 rounded-xl">
                            <Info className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase">{v.make} {v.model}</p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">YEAR: {v.year || "N/A"}</span>
                              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase">PLATE: {v.plateNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditVehicle(v)} className="rounded-lg hover:bg-primary/10 hover:text-primary">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(v.id, `${v.make} ${v.model} (${v.plateNumber})`)} className="rounded-lg text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {vTotalPages > 1 && (
                    <div className="p-4 border-t border-slate-50 flex items-center justify-center gap-2 bg-slate-50/20">
                      <Button variant="ghost" size="sm" onClick={() => setVPage((p) => Math.max(1, p - 1))} disabled={vPage === 1}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page {vPage} of {vTotalPages}</span>
                      <Button variant="ghost" size="sm" onClick={() => setVPage((p) => Math.min(vTotalPages, p + 1))} disabled={vPage === vTotalPages}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Appointments History Tab ===== */}
        <TabsContent value="appointments" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {historyLoading ? (
            <LoadingSpinner />
          ) : historyError ? (
            <div className="mb-4"><ErrorHandler type={historyError.type} title={historyError.title} message={historyError.message} /></div>
          ) : groupedHistory.length === 0 ? (
            <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
              <CardContent className="p-8 text-center">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No appointment history found for this customer.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-10">
              {groupedHistory.map(([date, appointmentsMap]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      {format(parseISO(date), "MMMM dd, yyyy")}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Horizontal scrollable row of appointments */}
                  <div className="flex gap-4 overflow-x-auto pb-4 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {Array.from(appointmentsMap.entries()).map(([appointmentId, entries]) => {
                      const apptData = entries[0]?.appointment;
                      if (!apptData) return null;
                      const sortedEntries = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      return (
                        <div key={appointmentId} className="min-w-[350px] max-w-[400px] flex-shrink-0 snap-start">
                          {/* Appointment Card */}
                          <AppointmentCard appointment={apptData} className="mb-3">
                            <CustomerCard customerId={apptData.customerId} />
                            <VehicleCard vehicleId={apptData.vehicleId} customerId={apptData.customerId} />
                            {apptData.services?.map((service: any) => (
                              <ServiceCard key={service.id} serviceId={service.id} />
                            ))}
                          </AppointmentCard>

                          {/* Timeline of status changes for this appointment on this date */}
                          <div className="ml-4 pl-8 border-l-2 border-slate-200 space-y-2">
                            {sortedEntries.map((entry, idx) => (
                              <div key={entry.id} className="relative flex items-start gap-3 pb-2 last:pb-0">
                                <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge status={entry.toStatus} className="text-[10px]" />
                                    {entry.fromStatus && (
                                      <span className="text-[10px] text-slate-400">
                                        from <StatusBadge status={entry.fromStatus} className="text-[10px] inline-block" />
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                      {format(parseISO(entry.createdAt), "h:mm a")}
                                    </span>
                                  </div>
                                  {entry.staff && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Changed by <strong>{entry.staff.fullname}</strong>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vehicle Form Modal */}
      <DataModal open={vehicleModalOpen} onOpenChange={setVehicleModalOpen} title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"} onSubmit={handleSaveVehicle} isLoading={savingVehicle}>
        <div className="space-y-4">
          {apiError && <ErrorHandler type={apiError.type} title={apiError.title} message={apiError.message} />}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Plate Number</Label>
            <Input
              value={vehicleForm.plateNumber}
              onChange={(e) => { setVehicleForm({ ...vehicleForm, plateNumber: e.target.value }); if (vehicleFormErrors.plateNumber) setVehicleFormErrors({ ...vehicleFormErrors, plateNumber: undefined }); }}
              className={cn("rounded-xl border-slate-200 focus:ring-primary/20", vehicleFormErrors.plateNumber && "border-destructive")}
              placeholder="ABC-1234"
            />
            {vehicleFormErrors.plateNumber && <p className="text-xs text-destructive">{vehicleFormErrors.plateNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Make</Label>
              <Input
                value={vehicleForm.make}
                onChange={(e) => { setVehicleForm({ ...vehicleForm, make: e.target.value }); if (vehicleFormErrors.make) setVehicleFormErrors({ ...vehicleFormErrors, make: undefined }); }}
                className={cn("rounded-xl border-slate-200 focus:ring-primary/20", vehicleFormErrors.make && "border-destructive")}
                placeholder="Toyota"
              />
              {vehicleFormErrors.make && <p className="text-xs text-destructive">{vehicleFormErrors.make}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Model</Label>
              <Input
                value={vehicleForm.model}
                onChange={(e) => { setVehicleForm({ ...vehicleForm, model: e.target.value }); if (vehicleFormErrors.model) setVehicleFormErrors({ ...vehicleFormErrors, model: undefined }); }}
                className={cn("rounded-xl border-slate-200 focus:ring-primary/20", vehicleFormErrors.model && "border-destructive")}
                placeholder="Camry"
              />
              {vehicleFormErrors.model && <p className="text-xs text-destructive">{vehicleFormErrors.model}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Year (optional)</Label>
            <Input
              value={vehicleForm.year}
              onChange={(e) => { setVehicleForm({ ...vehicleForm, year: e.target.value }); if (vehicleFormErrors.year) setVehicleFormErrors({ ...vehicleFormErrors, year: undefined }); }}
              className={cn("rounded-xl border-slate-200 focus:ring-primary/20", vehicleFormErrors.year && "border-destructive")}
              placeholder="e.g., 2020"
            />
            {vehicleFormErrors.year && <p className="text-xs text-destructive">{vehicleFormErrors.year}</p>}
          </div>
        </div>
      </DataModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              You are about to delete <strong>{deleteDialog.vehicleName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVehicle} className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-6">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}