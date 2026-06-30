'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format, isSameDay } from "date-fns";
import { toast } from "sonner";

// Components
import PageContainer from "@/components/shared/page-container";
import LoadingSpinner from "@/components/shared/loading-spinner";
import StatusBadge from "@/components/shared/status-badge";
import ErrorHandler from "@/components/shared/error-handler";
import AppointmentCalendar from "@/components/appointments/appointment-calendar";
import CustomerPickerModal from "@/components/appointments/customer-picker-modal";
import VehiclePickerModal from "@/components/appointments/vehicle-picker-modal";
import AppointmentCard from "@/components/appointments/appointment-card";
import CustomerCard from "@/components/customers/customer-card";
import VehicleCard from "@/components/customers/vehicle-card";
import ServiceCard from "@/components/services/service-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarDays,
  Loader2,
  Car,
  UserCircle,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  PlusCircle,
  Wrench,
  FileText,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// API imports
import { appointmentsApi } from "@/lib/appointments/appointments";
import { customersApi } from "@/lib/customers/customers";
import { vehiclesApi } from "@/lib/customers/vehicles";
import { servicesApi } from "@/lib/services/services";
import { staffApi } from "@/lib/staffs/staffs";

// Types
interface Customer {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  deactivated?: boolean;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  estimatedDuration: number;
}

interface Staff {
  id: string;
  fullname: string;
  username: string;
}

interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  services: Service[]; // full service objects
  trackingNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  vehicle?: Vehicle;
}

// Form schema
const schema = z.object({
  customerId: z.string().uuid("Select a customer"),
  vehicleId: z.string().uuid("Select a vehicle"),
  services: z.array(z.string().uuid()).min(1, "Select at least one service"),
  appointmentDate: z.date({ required_error: "Select date" }),
  appointmentTime: z.string().min(1, "Select time"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hour, minute] = time24.split(":");
  let h = parseInt(hour, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
};

export default function AppointmentsPage() {
  // ==========================================================================
  // State
  // ==========================================================================
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sidebarFilter, setSidebarFilter] = useState("");

  // Form dependencies
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [customTimeChecked, setCustomTimeChecked] = useState<{ available: boolean; message: string } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedSlotType, setSelectedSlotType] = useState<"preset" | "custom">("preset");

  // Picker modals
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Decline modal
  const [declineModal, setDeclineModal] = useState<{
    open: boolean;
    appointment: Appointment | null;
    reason: string;
  }>({
    open: false,
    appointment: null,
    reason: "",
  });

  // API error
  const [apiError, setApiError] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  // Multi-select state
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePopoverOpen, setServicePopoverOpen] = useState(false);

  // ==========================================================================
  // React Hook Form
  // ==========================================================================
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: "",
      vehicleId: "",
      services: [],
      appointmentDate: new Date(),
      appointmentTime: "",
      notes: "",
    },
  });

  const watchCustomerId = watch("customerId");
  const watchServices = watch("services");
  const watchDate = watch("appointmentDate");

  // ==========================================================================
  // Data Loading
  // ==========================================================================
  const loadAppointments = useCallback(async () => {
    setApiError(null);
    try {
      const res = await appointmentsApi.list();
      if (res.error) {
        setApiError({
          type: res.errorType || "fe",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Failed to load appointments.",
        });
        setAppointments([]);
      } else {
        setAppointments(res.data || []);
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    }
  }, []);

  const loadDependencies = useCallback(async () => {
    try {
      const [custRes, svcRes, staffRes] = await Promise.all([
        customersApi.list(),
        servicesApi.list(true), // active only
        staffApi.list(),
      ]);
      setCustomers(custRes.error ? [] : (custRes.data || []));
      setServices(svcRes.error ? [] : (svcRes.data || []));
      setStaffList(staffRes.error ? [] : (staffRes.data || []));
    } catch (err) {
      console.error("Failed to load dependencies:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadAppointments(), loadDependencies()]);
      setLoading(false);
    };
    init();
  }, [loadAppointments, loadDependencies]);

  // ==========================================================================
  // Dynamic: Vehicles by customer
  // ==========================================================================
  useEffect(() => {
    if (watchCustomerId) {
      const fetchVehicles = async () => {
        try {
          const res = await vehiclesApi.list(watchCustomerId);
          setVehicles(res.error ? [] : (res.data || []));
          const currentVehicleId = watch("vehicleId");
          if (currentVehicleId && !res.data?.some(v => v.id === currentVehicleId)) {
            setSelectedVehicle(null);
            setValue("vehicleId", "");
          }
          const found = customers.find(c => c.id === watchCustomerId);
          if (found) setSelectedCustomer(found);
        } catch {
          setVehicles([]);
        }
      };
      fetchVehicles();
    } else {
      setVehicles([]);
      setSelectedVehicle(null);
      setSelectedCustomer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCustomerId, customers]);

  // ==========================================================================
  // Dynamic: Available slots
  // ==========================================================================
  useEffect(() => {
    const fetchSlots = async () => {
      if (watchDate && watchServices.length > 0) {
        const dateStr = format(watchDate, "yyyy-MM-dd");
        try {
          const res = await appointmentsApi.getAvailableSlots(dateStr, watchServices);
          if (!res.error) {
            setAvailableSlots(res.data || []);
          } else {
            setAvailableSlots([]);
          }
        } catch {
          setAvailableSlots([]);
        }
      } else {
        setAvailableSlots([]);
      }
    };
    fetchSlots();
  }, [watchDate, watchServices]);

  // Sync selected date to form
  useEffect(() => {
    if (selectedDate) setValue("appointmentDate", selectedDate);
  }, [selectedDate, setValue]);

  // ==========================================================================
  // Form Submission
  // ==========================================================================
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        services: data.services,
        appointmentDate: format(data.appointmentDate, "yyyy-MM-dd"),
        appointmentTime: data.appointmentTime,
        notes: data.notes || undefined,
      };
      const res = await appointmentsApi.create(payload);
      if (res.error) {
        setApiError({
          type: res.errorType || "fve",
          title: res.errorTitle || "Error",
          message: res.errorMessage || "Booking failed.",
        });
      } else {
        toast.success("Appointment booked successfully.");
        reset({
          ...data,
          appointmentTime: "",
          notes: "",
        });
        setCustomTime("");
        setCustomTimeChecked(null);
        await loadAppointments();
      }
    } catch (err: any) {
      setApiError({
        type: "se",
        title: "Unexpected Error",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // Confirm / Decline Handlers
  // ==========================================================================
  const handleConfirm = async (appt: Appointment) => {
    setApiError(null);
    try {
      const res = await appointmentsApi.updateStatus(appt.id, "CONFIRMED");
      if (res.error) {
        toast.error(res.errorMessage || "Failed to confirm.");
      } else {
        toast.success("Appointment confirmed.");
        await loadAppointments();
      }
    } catch (err: any) {
      toast.error(err.message || "Error confirming.");
    }
  };

  const handleDecline = async () => {
    const { appointment, reason } = declineModal;
    if (!appointment || !reason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    setApiError(null);
    try {
      const res = await appointmentsApi.updateStatus(appointment.id, "CANCELLED", reason.trim());
      if (res.error) {
        toast.error(res.errorMessage || "Failed to decline.");
      } else {
        toast.success("Appointment declined.");
        setDeclineModal({ open: false, appointment: null, reason: "" });
        await loadAppointments();
      }
    } catch (err: any) {
      toast.error(err.message || "Error declining.");
    }
  };

  // ==========================================================================
  // Custom time check
  // ==========================================================================
  const handleCheckCustomTime = async () => {
    if (!customTime || !watchDate || watchServices.length === 0) return;
    setCheckingAvailability(true);
    setCustomTimeChecked(null);
    try {
      const dateStr = format(watchDate, "yyyy-MM-dd");
      const res = await appointmentsApi.checkAvailability(dateStr, customTime, watchServices);
      if (res.error) {
        toast.error(res.errorMessage || "Error checking availability.");
      } else if (res.available) {
        setCustomTimeChecked({ available: true, message: "Time is available!" });
        setValue("appointmentTime", customTime);
      } else {
        setCustomTimeChecked({
          available: false,
          message: res.message || "Slot is not available.",
        });
        setValue("appointmentTime", "");
      }
    } catch (err: any) {
      toast.error(err.message || "Error checking availability.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  // ==========================================================================
  // Filtered appointments for sidebar
  // ==========================================================================
  const filteredAppointments = appointments
    .filter((a) => {
      const matchesDate =
        a.appointmentDate && isSameDay(new Date(a.appointmentDate), selectedDate);
      const searchStr =
        `${a.customer?.fullname} ${a.vehicle?.plateNumber} ${a.vehicle?.model}`.toLowerCase();
      const matchesSearch = searchStr.includes(sidebarFilter.toLowerCase());
      return matchesDate && matchesSearch;
    })
    .sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || ""));

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading) return <LoadingSpinner />;

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <PageContainer title="Service Scheduler" subtitle="Confirm or decline customer bookings">
      {/* API Error */}
      {apiError && (
        <div className="mb-4">
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========== LEFT & CENTER ========== */}
        <div className="lg:col-span-8 space-y-6">
          {/* Calendar */}
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <AppointmentCalendar
              currentMonth={currentMonth}
              onMonthChange={(dir: number) => setCurrentMonth(addMonths(currentMonth, dir))}
              appointments={appointments}
              selectedDate={selectedDate}
              onDateClick={setSelectedDate}
            />
          </Card>

          {/* Booking Form */}
          <Card className="border-none shadow-lg bg-slate-50/50 rounded-3xl border border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                New Booking for {format(selectedDate, "MMM dd")}
              </CardTitle>
              <CardDescription className="font-bold text-xs">
                Fill in the details to reserve a service slot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-500">
                      Customer
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl bg-white border-slate-200 justify-start text-left font-normal hover:bg-white/80"
                      onClick={() => setCustomerPickerOpen(true)}
                    >
                      {watchCustomerId && selectedCustomer ? (
                        <span className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-primary" />
                          <span className="font-medium">{selectedCustomer.fullname}</span>
                          <span className="text-xs text-muted-foreground">({selectedCustomer.phone})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Identify customer...</span>
                      )}
                    </Button>
                    {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-500">
                      Vehicle
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-xl bg-white border-slate-200 justify-start text-left font-normal hover:bg-white/80"
                      onClick={() => setVehiclePickerOpen(true)}
                      disabled={!watchCustomerId}
                    >
                      {watch("vehicleId") && selectedVehicle ? (
                        <span className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-primary" />
                          <span className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</span>
                          <span className="text-xs text-muted-foreground">({selectedVehicle.plateNumber})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {watchCustomerId ? "Select asset..." : "Select customer first"}
                        </span>
                      )}
                    </Button>
                    {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId.message}</p>}
                  </div>

                  {/* Services (multi-select) */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-black uppercase text-slate-500">
                      Services
                    </Label>
                    <Popover open={servicePopoverOpen} onOpenChange={setServicePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={servicePopoverOpen}
                          className="w-full justify-between h-12 rounded-xl bg-white border-slate-200"
                        >
                          {watchServices.length > 0
                            ? `${watchServices.length} service(s) selected`
                            : "Select services..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 rounded-xl">
                        <Command>
                          <CommandInput
                            placeholder="Search services..."
                            value={serviceSearch}
                            onValueChange={setServiceSearch}
                          />
                          <CommandEmpty>No service found.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            {services.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.id}
                                onSelect={() => {
                                  const current = watchServices || [];
                                  const newVal = current.includes(s.id)
                                    ? current.filter(id => id !== s.id)
                                    : [...current, s.id];
                                  setValue("services", newVal);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchServices.includes(s.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span>{s.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({s.estimatedDuration} min)
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.services && <p className="text-xs text-destructive">{errors.services.message}</p>}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-black uppercase text-slate-500">
                      Additional Notes / Describe the issue
                    </Label>
                    <Textarea
                      placeholder="e.g., Engine makes a ticking noise, AC not cooling, etc."
                      className="rounded-xl border-slate-200 focus:ring-primary/20 min-h-[80px]"
                      {...register("notes")}
                    />
                    <p className="text-[10px] text-slate-400">
                      Let us know any special requests or symptoms.
                    </p>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-black uppercase text-slate-500">
                      Available Slot
                    </Label>

                    {!watchDate || watchServices.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-100/50 border-2 border-dashed border-slate-200 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {watchServices.length === 0
                            ? "Select date & services first"
                            : "Select date first"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Preset Slots */}
                        {availableSlots.length === 0 ? (
                          <p className="text-xs font-bold text-red-500 py-3">
                            No slots available for this date
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => {
                                  if (slot.available) {
                                    setValue("appointmentTime", slot.time);
                                    setCustomTimeChecked(null);
                                    setCustomTime("");
                                  }
                                }}
                                className={cn(
                                  "px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                  watch("appointmentTime") === slot.time
                                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                                    : slot.available
                                    ? "bg-white border border-slate-200 text-slate-700 hover:border-primary/50 hover:bg-primary/5"
                                    : "bg-slate-50 border border-slate-100 text-slate-300 line-through cursor-not-allowed"
                                )}
                              >
                                {formatTime12h(slot.time)}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Time Option */}
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          {selectedSlotType === "custom" ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  type="time"
                                  value={customTime}
                                  onChange={(e) => setCustomTime(e.target.value)}
                                  className="h-12 rounded-xl bg-white border-slate-200 flex-1"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-12 px-4 rounded-xl border-amber-300 text-amber-600 hover:bg-amber-50"
                                  disabled={!customTime || checkingAvailability}
                                  onClick={handleCheckCustomTime}
                                >
                                  {checkingAvailability ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Check"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-12 px-3"
                                  onClick={() => {
                                    setSelectedSlotType("preset");
                                    setCustomTime("");
                                    setCustomTimeChecked(null);
                                    setValue("appointmentTime", "");
                                  }}
                                >
                                  <XCircle className="w-4 h-4 text-slate-400" />
                                </Button>
                              </div>
                              {customTimeChecked && (
                                <div
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                                    customTimeChecked.available
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  }`}
                                >
                                  {customTimeChecked.available ? (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  {customTimeChecked.message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedSlotType("custom")}
                              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Pick Custom Time
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl text-base font-black uppercase shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="mr-2 w-5 h-5" />
                  )}
                  Add Appointment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ========== RIGHT: Daily Agenda ========== */}
        <div className="lg:col-span-4 h-full">
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
                  <AppointmentCard key={appt.id} appointmentId={appt.id}>
                    <CustomerCard customerId={appt.customerId} />
                    <VehicleCard
                      vehicleId={appt.vehicleId}
                      customerId={appt.customerId}
                    />
                    {/* Service Cards */}
                    {appt.services && appt.services.length > 0 ? (
                      appt.services.map((service) => (
                        <ServiceCard key={service.id} serviceId={service.id} />
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        No services selected.
                      </div>
                    )}
                    {/* Pending Quick Actions */}
                    {appt.status === "PENDING" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="flex-1 text-green-600 bg-green-50 hover:bg-green-100 h-8 text-[10px] font-black uppercase"
                          onClick={() => handleConfirm(appt)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-red-400 hover:bg-red-50 h-8 text-[10px] font-black uppercase"
                          onClick={() =>
                            setDeclineModal({
                              open: true,
                              appointment: appt,
                              reason: "",
                            })
                          }
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
        </div>
      </div>

      {/* ===== Decline Dialog ===== */}
      <Dialog
        open={declineModal.open}
        onOpenChange={(open) => setDeclineModal({ ...declineModal, open })}
      >
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
              onChange={(e) =>
                setDeclineModal({ ...declineModal, reason: e.target.value })
              }
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                setDeclineModal({ open: false, appointment: null, reason: "" })
              }
              className="font-bold uppercase text-xs"
            >
              Ignore
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              className="font-black uppercase text-xs px-6 rounded-xl"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Customer Picker Modal ===== */}
      <CustomerPickerModal
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        customers={customers}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setValue("customerId", customer.id);
          setSelectedVehicle(null);
          setValue("vehicleId", "");
        }}
        selectedCustomerId={watchCustomerId}
      />

      {/* ===== Vehicle Picker Modal ===== */}
      <VehiclePickerModal
        open={vehiclePickerOpen}
        onOpenChange={setVehiclePickerOpen}
        vehicles={vehicles}
        onSelect={(vehicle) => {
          setSelectedVehicle(vehicle);
          setValue("vehicleId", vehicle.id);
        }}
        selectedVehicleId={watch("vehicleId")}
        customerName={selectedCustomer?.fullname}
      />
    </PageContainer>
  );
}