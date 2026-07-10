// components/appointments/booking-form-card.tsx
'use client';

import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  PlusCircle, Car, UserCircle, Clock, Loader2, CheckCircle, XCircle, Check, ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomerPickerModal from '@/components/appointments/customer-picker-modal';
import VehiclePickerModal from '@/components/appointments/vehicle-picker-modal';
import { useAppointmentForm } from '@/hooks/appointments/useAppointmentForm';
import { formatTime12h } from '@/app-utils/appointments/helpers';

interface BookingFormCardProps {
  customers: any[];
  services: any[];
  selectedDate: Date;
  onSuccess: () => void; // to refresh appointments
}

export default function BookingFormCard({
  customers,
  services,
  selectedDate,
  onSuccess,
}: BookingFormCardProps) {
  const {
    form,
    vehicles,
    selectedCustomer,
    selectedVehicle,
    setSelectedCustomer,
    setSelectedVehicle,
    availableSlots,
    isSubmitting,
    customTime,
    setCustomTime,
    customTimeChecked,
    setCustomTimeChecked,
    checkingAvailability,
    selectedSlotType,
    setSelectedSlotType,
    handleCheckCustomTime,
    submitHandler,
  } = useAppointmentForm(customers, onSuccess);

  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false);
  const [vehiclePickerOpen, setVehiclePickerOpen] = React.useState(false);
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [servicePopoverOpen, setServicePopoverOpen] = React.useState(false);

  const { register, setValue, watch, formState: { errors } } = form;
  const watchCustomerId = watch('customerId');
  const watchServices = watch('services');
  const watchDate = watch('appointmentDate');

  // Sync selected date from parent to form
  React.useEffect(() => {
    if (selectedDate) setValue('appointmentDate', selectedDate);
  }, [selectedDate, setValue]);

  const onSubmit = form.handleSubmit(submitHandler);

  return (
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
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">Customer</Label>
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
              <Label className="text-xs font-black uppercase text-slate-500">Vehicle</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl bg-white border-slate-200 justify-start text-left font-normal hover:bg-white/80"
                onClick={() => setVehiclePickerOpen(true)}
                disabled={!watchCustomerId}
              >
                {watch('vehicleId') && selectedVehicle ? (
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

            {/* Services multi-select */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-black uppercase text-slate-500">Services</Label>
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
                            setValue('services', newVal);
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

      {/* Picker modals */}
      <CustomerPickerModal
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        customers={customers}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setValue('customerId', customer.id);
          setSelectedVehicle(null);
          setValue('vehicleId', '');
        }}
        selectedCustomerId={watchCustomerId}
      />
      <VehiclePickerModal
        open={vehiclePickerOpen}
        onOpenChange={setVehiclePickerOpen}
        vehicles={vehicles}
        onSelect={(vehicle) => {
          setSelectedVehicle(vehicle);
          setValue('vehicleId', vehicle.id);
        }}
        selectedVehicleId={watch('vehicleId')}
        customerName={selectedCustomer?.fullname}
      />
    </Card>
  );
}