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
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <PlusCircle className="h-5 w-5 text-primary" />
          New Booking · {format(selectedDate, "MMM dd")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Fill in the details to reserve a service slot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Customer & Vehicle pickers — two-up on tablet, single column in the narrow desktop pane */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
            {/* Customer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Customer</Label>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start rounded-md px-3 text-left font-normal md:h-9"
                onClick={() => setCustomerPickerOpen(true)}
              >
                {watchCustomerId && selectedCustomer ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <UserCircle className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate font-medium text-foreground">{selectedCustomer.fullname}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">({selectedCustomer.phone})</span>
                  </span>
                ) : (
                  <span className="truncate text-muted-foreground">Identify customer…</span>
                )}
              </Button>
              {errors.customerId && <p className="text-xs font-medium text-destructive">{errors.customerId.message}</p>}
            </div>

            {/* Vehicle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Vehicle</Label>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start rounded-md px-3 text-left font-normal md:h-9"
                onClick={() => setVehiclePickerOpen(true)}
                disabled={!watchCustomerId}
              >
                {watch('vehicleId') && selectedVehicle ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Car className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate font-medium text-foreground">{selectedVehicle.make} {selectedVehicle.model}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">({selectedVehicle.plateNumber})</span>
                  </span>
                ) : (
                  <span className="truncate text-muted-foreground">
                    {watchCustomerId ? "Select asset…" : "Select customer first"}
                  </span>
                )}
              </Button>
              {errors.vehicleId && <p className="text-xs font-medium text-destructive">{errors.vehicleId.message}</p>}
            </div>
          </div>

          {/* Services multi-select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Services</Label>
            <Popover open={servicePopoverOpen} onOpenChange={setServicePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={servicePopoverOpen}
                  className="h-11 w-full justify-between rounded-md px-3 font-normal md:h-9"
                >
                  <span className="truncate">
                    {watchServices.length > 0
                      ? `${watchServices.length} service(s) selected`
                      : "Select services…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] rounded-lg p-0">
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
            {errors.services && <p className="text-xs font-medium text-destructive">{errors.services.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Additional Notes / Describe the issue
            </Label>
            <Textarea
              placeholder="e.g., Engine makes a ticking noise, AC not cooling, etc."
              className="min-h-[80px] rounded-md text-base md:text-sm"
              {...register("notes")}
            />
            <p className="text-xs text-muted-foreground">
              Let us know any special requests or symptoms.
            </p>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Available Slot</Label>

            {!watchDate || watchServices.length === 0 ? (
              <div className="rounded-md border-2 border-dashed border-border bg-muted/30 p-4 text-center md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {watchServices.length === 0
                    ? "Select date & services first"
                    : "Select date first"}
                </p>
              </div>
            ) : (
              <>
                {/* Preset Slots */}
                {availableSlots.length === 0 ? (
                  <p className="py-2 text-sm font-medium text-destructive">
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
                        aria-pressed={watch("appointmentTime") === slot.time}
                        className={cn(
                          "flex h-11 items-center rounded-md px-4 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:px-3",
                          watch("appointmentTime") === slot.time
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : slot.available
                              ? "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                              : "cursor-not-allowed border border-border/60 bg-muted/50 text-muted-foreground/60 line-through",
                        )}
                      >
                        {formatTime12h(slot.time)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Time Option */}
                <div className="mt-3 border-t border-border pt-3">
                  {selectedSlotType === "custom" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="h-11 flex-1 rounded-md text-base md:h-9 md:text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-11 rounded-md border-amber-500/40 px-4 text-sm font-medium text-amber-700 hover:bg-amber-500/10 md:h-9 dark:text-amber-400"
                          disabled={!customTime || checkingAvailability}
                          onClick={handleCheckCustomTime}
                        >
                          {checkingAvailability ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Check"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Cancel custom time"
                          className="h-11 w-11 rounded-md md:h-9 md:w-9"
                          onClick={() => {
                            setSelectedSlotType("preset");
                            setCustomTime("");
                            setCustomTimeChecked(null);
                            setValue("appointmentTime", "");
                          }}
                        >
                          <XCircle className="h-5 w-5 text-muted-foreground md:h-4 md:w-4" />
                        </Button>
                      </div>
                      {customTimeChecked && (
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-2.5 text-xs font-medium",
                            customTimeChecked.available
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-destructive/30 bg-destructive/10 text-destructive",
                          )}
                        >
                          {customTimeChecked.available ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {customTimeChecked.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedSlotType("custom")}
                      className="flex h-11 items-center gap-2 rounded-md text-sm font-medium text-amber-700 transition-colors hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 dark:text-amber-400"
                    >
                      <Clock className="h-4 w-4" />
                      Pick Custom Time
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-md text-sm font-semibold md:h-9"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
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