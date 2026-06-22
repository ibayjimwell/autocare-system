'use client';

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { vehiclesApi } from "@/lib/customers/vehicles";
import { toast } from "sonner";
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

// Type for vehicle
interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

// Type for customer (minimal)
interface Customer {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  deactivated?: boolean;
}

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
}

export default function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  // ==========================================================================
  // State
  // ==========================================================================
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vSearch, setVSearch] = useState("");
  const [vPage, setVPage] = useState(1);
  const itemsPerPage = 5;

  // Vehicle modal states
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleFormErrors, setVehicleFormErrors] = useState<{
    plateNumber?: string;
    make?: string;
    model?: string;
    year?: string;
  }>({});

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    vehicleId: string | null;
    vehicleName: string;
  }>({
    open: false,
    vehicleId: null,
    vehicleName: "",
  });

  // API error
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  // ==========================================================================
  // Load vehicles
  // ==========================================================================
  const loadVehicles = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await vehiclesApi.list(customer.id);
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load vehicles.",
        });
        setVehicles([]);
      } else {
        setVehicles(res.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  // ==========================================================================
  // Search & pagination
  // ==========================================================================
  const filteredVehicles = vehicles.filter((v) =>
    `${v.make} ${v.model} ${v.plateNumber}`
      .toLowerCase()
      .includes(vSearch.toLowerCase())
  );
  const vTotalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = filteredVehicles.slice(
    (vPage - 1) * itemsPerPage,
    vPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setVPage(1);
  }, [vSearch]);

  // ==========================================================================
  // Vehicle form helpers
  // ==========================================================================
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
        setApiError({
          type: res.errorType || "fve",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Operation failed.",
        });
      } else {
        toast.success(editingVehicle ? "Vehicle updated." : "Vehicle added.");
        setVehicleModalOpen(false);
        await loadVehicles();
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
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

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading) return <LoadingSpinner />;

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <PageContainer
      title={customer.fullname}
      subtitle="Customer Profile & Asset Management"
      actions={
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-xl hover:bg-slate-100 transition-all font-semibold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      }
    >
      {/* ---- Customer Info Header ---- */}
      <Card className="mb-8 border-none shadow-sm bg-gradient-to-r from-slate-50 to-white overflow-hidden animate-in fade-in duration-500">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black shadow-lg">
              {customer.fullname.charAt(0)}
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {customer.fullname}
              </h2>
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

      {/* ---- API Error Display ---- */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      {/* ---- Tabs: Vehicles & Appointments ---- */}
      <Tabs defaultValue="vehicles" className="w-full space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-14 w-full md:w-auto grid grid-cols-2 md:inline-flex">
          <TabsTrigger
            value="vehicles"
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold px-8 transition-all"
          >
            <Car className="w-4 h-4 mr-2" /> Registered Vehicles
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold px-8 transition-all"
          >
            <CalendarDays className="w-4 h-4 mr-2" /> Appointments
          </TabsTrigger>
        </TabsList>

        {/* ===== Vehicles Tab ===== */}
        <TabsContent
          value="vehicles"
          className="space-y-4 animate-in slide-in-from-bottom-4 duration-500"
        >
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Find specific vehicle..."
                className="pl-10 h-11 rounded-xl bg-white border-slate-200 focus:ring-primary"
                value={vSearch}
                onChange={(e) => {
                  setVSearch(e.target.value);
                }}
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
                  <p className="text-slate-500 font-medium">
                    No registered vehicles found
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-50">
                    {paginatedVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 p-3 rounded-xl">
                            <Info className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase">
                              {v.make} {v.model}
                            </p>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                                YEAR: {v.year || "N/A"}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase">
                                PLATE: {v.plateNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditVehicle(v)}
                            className="rounded-lg hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(v.id, `${v.make} ${v.model} (${v.plateNumber})`)}
                            className="rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {vTotalPages > 1 && (
                    <div className="p-4 border-t border-slate-50 flex items-center justify-center gap-2 bg-slate-50/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVPage((p) => Math.max(1, p - 1))}
                        disabled={vPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Page {vPage} of {vTotalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVPage((p) => Math.min(vTotalPages, p + 1))}
                        disabled={vPage === vTotalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Appointments Tab (Placeholder – future implementation) ===== */}
        <TabsContent
          value="appointments"
          className="space-y-4 animate-in slide-in-from-bottom-4 duration-500"
        >
          <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Service Logs & History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-center py-16 text-slate-500 font-medium italic">
                Appointments feature coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Vehicle Form Modal (Create / Edit) ===== */}
      <DataModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
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

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Plate Number</Label>
            <Input
              value={vehicleForm.plateNumber}
              onChange={(e) => {
                setVehicleForm({ ...vehicleForm, plateNumber: e.target.value });
                if (vehicleFormErrors.plateNumber) setVehicleFormErrors({ ...vehicleFormErrors, plateNumber: undefined });
              }}
              className={cn(
                "rounded-xl border-slate-200 focus:ring-primary/20",
                vehicleFormErrors.plateNumber && "border-destructive focus:ring-destructive"
              )}
              placeholder="ABC-1234"
            />
            {vehicleFormErrors.plateNumber && (
              <p className="text-xs text-destructive">{vehicleFormErrors.plateNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Make</Label>
              <Input
                value={vehicleForm.make}
                onChange={(e) => {
                  setVehicleForm({ ...vehicleForm, make: e.target.value });
                  if (vehicleFormErrors.make) setVehicleFormErrors({ ...vehicleFormErrors, make: undefined });
                }}
                className={cn(
                  "rounded-xl border-slate-200 focus:ring-primary/20",
                  vehicleFormErrors.make && "border-destructive focus:ring-destructive"
                )}
                placeholder="Toyota"
              />
              {vehicleFormErrors.make && (
                <p className="text-xs text-destructive">{vehicleFormErrors.make}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Model</Label>
              <Input
                value={vehicleForm.model}
                onChange={(e) => {
                  setVehicleForm({ ...vehicleForm, model: e.target.value });
                  if (vehicleFormErrors.model) setVehicleFormErrors({ ...vehicleFormErrors, model: undefined });
                }}
                className={cn(
                  "rounded-xl border-slate-200 focus:ring-primary/20",
                  vehicleFormErrors.model && "border-destructive focus:ring-destructive"
                )}
                placeholder="Camry"
              />
              {vehicleFormErrors.model && (
                <p className="text-xs text-destructive">{vehicleFormErrors.model}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Year (optional)</Label>
            <Input
              value={vehicleForm.year}
              onChange={(e) => {
                setVehicleForm({ ...vehicleForm, year: e.target.value });
                if (vehicleFormErrors.year) setVehicleFormErrors({ ...vehicleFormErrors, year: undefined });
              }}
              className={cn(
                "rounded-xl border-slate-200 focus:ring-primary/20",
                vehicleFormErrors.year && "border-destructive focus:ring-destructive"
              )}
              placeholder="e.g., 2020"
            />
            {vehicleFormErrors.year && (
              <p className="text-xs text-destructive">{vehicleFormErrors.year}</p>
            )}
          </div>
        </div>
      </DataModal>

      {/* ===== Delete Confirmation Dialog ===== */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">
              Delete Vehicle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600">
              You are about to delete <strong>{deleteDialog.vehicleName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="h-12 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-6"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}