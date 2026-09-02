'use client';

import React from 'react';

import { format } from 'date-fns';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Textarea,
} from '@/components/ui/textarea';

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
  PlusCircle,
  Car,
  UserCircle,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Check,
  ChevronsUpDown,
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
  onSuccess: () => void;
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
  } = useAppointmentForm(
    customers,
    onSuccess,
  );

  const [customerPickerOpen, setCustomerPickerOpen] =
    React.useState(false);

  const [vehiclePickerOpen, setVehiclePickerOpen] =
    React.useState(false);

  const [serviceSearch, setServiceSearch] =
    React.useState('');

  const [servicePopoverOpen, setServicePopoverOpen] =
    React.useState(false);

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchCustomerId =
    watch('customerId');

  const watchServices =
    watch('services');

  const watchDate =
    watch('appointmentDate');

  React.useEffect(() => {
    if (selectedDate) {
      setValue(
        'appointmentDate',
        selectedDate,
      );
    }
  }, [
    selectedDate,
    setValue,
  ]);

  const onSubmit =
    form.handleSubmit(submitHandler);

  return (
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="border-b border-border px-4 py-4 md:px-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <PlusCircle className="h-5 w-5 text-primary" />
          New Booking
        </CardTitle>

        <CardDescription className="text-xs leading-5 text-muted-foreground">
          {format(
            selectedDate,
            'MMM dd, yyyy',
          )}{' '}
          · Reserve a service slot for a customer.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 md:p-5">
        <form
          onSubmit={onSubmit}
          className="space-y-5"
        >
          {/* Customer / Vehicle */}
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer
              </Label>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomerPickerOpen(true)
                }
                className="
                  h-11 w-full justify-start
                  rounded-md px-3 text-left
                  text-base font-normal
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-9 md:text-sm
                "
              >
                {watchCustomerId &&
                selectedCustomer ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <UserCircle className="h-4 w-4 shrink-0 text-primary" />

                    <span className="truncate font-medium text-foreground">
                      {
                        selectedCustomer.fullname
                      }
                    </span>

                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      ({selectedCustomer.phone})
                    </span>
                  </span>
                ) : (
                  <span className="truncate text-muted-foreground">
                    Identify customer…
                  </span>
                )}
              </Button>

              {errors.customerId && (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  {errors.customerId.message}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vehicle
              </Label>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVehiclePickerOpen(true)
                }
                disabled={!watchCustomerId}
                className="
                  h-11 w-full justify-start
                  rounded-md px-3 text-left
                  text-base font-normal
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                  md:h-9 md:text-sm
                "
              >
                {watch('vehicleId') &&
                selectedVehicle ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Car className="h-4 w-4 shrink-0 text-primary" />

                    <span className="truncate font-medium text-foreground">
                      {selectedVehicle.make}{' '}
                      {selectedVehicle.model}
                    </span>

                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      ({selectedVehicle.plateNumber})
                    </span>
                  </span>
                ) : (
                  <span className="truncate text-muted-foreground">
                    {watchCustomerId
                      ? 'Select vehicle…'
                      : 'Select customer first'}
                  </span>
                )}
              </Button>

              {errors.vehicleId && (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  {errors.vehicleId.message}
                </p>
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Services
            </Label>

            <Popover
              open={servicePopoverOpen}
              onOpenChange={
                setServicePopoverOpen
              }
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={
                    servicePopoverOpen
                  }
                  className="
                    h-11 w-full justify-between
                    rounded-md px-3 text-base font-normal
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    md:h-9 md:text-sm
                  "
                >
                  <span className="truncate">
                    {watchServices.length > 0
                      ? `${watchServices.length} service(s) selected`
                      : 'Select services…'}
                  </span>

                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="
                  w-[var(--radix-popover-trigger-width)]
                  rounded-lg p-0
                "
              >
                <Command>
                  <CommandInput
                    placeholder="Search services..."
                    value={serviceSearch}
                    onValueChange={
                      setServiceSearch
                    }
                  />

                  <CommandEmpty>
                    No service found.
                  </CommandEmpty>

                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {services.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.id}
                        onSelect={() => {
                          const current =
                            watchServices || [];

                          const newVal =
                            current.includes(s.id)
                              ? current.filter(
                                  (id) =>
                                    id !==
                                    s.id,
                                )
                              : [
                                  ...current,
                                  s.id,
                                ];

                          setValue(
                            'services',
                            newVal,
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            watchServices.includes(
                              s.id,
                            )
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />

                        <span>
                          {s.name}
                        </span>

                        <span className="ml-2 text-xs text-muted-foreground">
                          ({s.estimatedDuration}{' '}
                          min)
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {errors.services && (
              <p className="mt-1.5 text-xs font-medium text-destructive">
                {errors.services.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Notes
            </Label>

            <Textarea
              placeholder="e.g., Engine makes a ticking noise, AC not cooling, etc."
              className="
                min-h-[88px] rounded-md
                text-base
                focus-visible:ring-2
                focus-visible:ring-ring
                md:text-sm
              "
              {...register('notes')}
            />

            <p className="mt-1.5 text-xs text-muted-foreground">
              Let us know any special requests or
              symptoms.
            </p>
          </div>

          {/* Time */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available Slot
              </Label>

              {watchDate &&
                watchServices.length > 0 && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {format(
                      selectedDate,
                      'MMM d',
                    )}
                  </span>
                )}
            </div>

            {!watchDate ||
            watchServices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center">
                <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />

                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {watchServices.length === 0
                    ? 'Select date & services first'
                    : 'Select date first'}
                </p>
              </div>
            ) : (
              <>
                {availableSlots.length === 0 ? (
                  <p className="py-2 text-sm font-medium text-destructive">
                    No slots available for this
                    date
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {availableSlots.map(
                      (slot) => (
                        <button
                          type="button"
                          key={slot.time}
                          disabled={
                            !slot.available
                          }
                          onClick={() => {
                            if (
                              slot.available
                            ) {
                              setValue(
                                'appointmentTime',
                                slot.time,
                              );
                              setCustomTimeChecked(
                                null,
                              );
                              setCustomTime('');
                            }
                          }}
                          aria-pressed={
                            watch(
                              'appointmentTime',
                            ) === slot.time
                          }
                          className={cn(
                            `
                              flex h-11 items-center
                              justify-center rounded-md
                              px-3 text-xs font-semibold
                              uppercase tracking-wide
                              transition-colors
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-ring
                              focus-visible:ring-offset-2
                              md:h-9
                            `,
                            watch(
                              'appointmentTime',
                            ) === slot.time
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : slot.available
                                ? 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
                                : 'cursor-not-allowed border border-border/60 bg-muted/50 text-muted-foreground/60 line-through',
                          )}
                        >
                          {formatTime12h(
                            slot.time,
                          )}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {/* Custom Time */}
                <div className="mt-3 border-t border-border pt-3">
                  {selectedSlotType ===
                  'custom' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <Input
                          type="time"
                          value={customTime}
                          onChange={(e) =>
                            setCustomTime(
                              e.target
                                .value,
                            )
                          }
                          className="
                            h-11 rounded-md
                            text-base
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            md:h-9 md:text-sm
                          "
                        />

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            !customTime ||
                            checkingAvailability
                          }
                          onClick={
                            handleCheckCustomTime
                          }
                          className="
                            h-11 rounded-md px-4
                            text-sm font-medium
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                            md:h-9
                          "
                        >
                          {checkingAvailability ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Check'
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Cancel custom time"
                          onClick={() => {
                            setSelectedSlotType(
                              'preset',
                            );
                            setCustomTime('');
                            setCustomTimeChecked(
                              null,
                            );
                            setValue(
                              'appointmentTime',
                              '',
                            );
                          }}
                          className="
                            h-11 w-11 rounded-md
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                            md:h-9 md:w-9
                          "
                        >
                          <XCircle className="h-5 w-5 text-muted-foreground md:h-4 md:w-4" />
                        </Button>
                      </div>

                      {customTimeChecked && (
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-md border p-2.5 text-xs font-medium',
                            customTimeChecked.available
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-destructive/30 bg-destructive/10 text-destructive',
                          )}
                        >
                          {customTimeChecked.available ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}

                          {
                            customTimeChecked.message
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSlotType(
                          'custom',
                        )
                      }
                      className="
                        flex h-11 items-center gap-2
                        rounded-md px-1
                        text-sm font-medium
                        text-amber-700
                        transition-colors
                        hover:text-amber-800
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        dark:text-amber-400
                        md:h-9
                      "
                    >
                      <Clock className="h-4 w-4" />
                      Pick Custom Time
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="
              h-11 w-full rounded-md
              text-sm font-semibold
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              md:h-9
            "
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

      <CustomerPickerModal
        open={customerPickerOpen}
        onOpenChange={
          setCustomerPickerOpen
        }
        customers={customers}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setValue(
            'customerId',
            customer.id,
          );
          setSelectedVehicle(null);
          setValue(
            'vehicleId',
            '',
          );
        }}
        selectedCustomerId={
          watchCustomerId
        }
      />

      <VehiclePickerModal
        open={vehiclePickerOpen}
        onOpenChange={
          setVehiclePickerOpen
        }
        vehicles={vehicles}
        onSelect={(vehicle) => {
          setSelectedVehicle(vehicle);
          setValue(
            'vehicleId',
            vehicle.id,
          );
        }}
        selectedVehicleId={watch(
          'vehicleId',
        )}
        customerName={
          selectedCustomer?.fullname
        }
      />
    </Card>
  );
}