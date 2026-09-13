'use client';

import React from 'react';

import {
  format,
} from 'date-fns';

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
  Check,
  ChevronsUpDown,
  ClipboardList,
  Wrench,
  Gauge,
  Settings2,
  Layers3,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

import CustomerPickerModal from '@/components/appointments/customer-picker-modal';

import VehiclePickerModal from '@/components/appointments/vehicle-picker-modal';

import {
  useAppointmentForm,
} from '@/hooks/appointments/useAppointmentForm';

import {
  formatTime12h,
} from '@/app-utils/appointments/helpers';

/* ================================================================
   TYPES
================================================================ */

interface Service {
  id: string;

  name: string;

  estimatedDuration: number;

  type?: string | null;

  active?: boolean;
}

interface BookingFormCardProps {
  customers: any[];

  services: Service[];

  selectedDate: Date;

  onSuccess: () => void;

  /*
   * Customers and services are supplied by the parent.
   *
   * Vehicle loading and available-slot loading are owned by
   * useAppointmentForm().
   */
  customersLoading?: boolean;

  servicesLoading?: boolean;
}

/* ================================================================
   SERVICE TYPES
================================================================ */

const SERVICE_TYPES = [
  'ALL',
  'PMS',
  'REPAIR',
  'CHECKUP',
  'MODIFICATION',
] as const;

type ServiceType =
  (typeof SERVICE_TYPES)[number];

/* ================================================================
   SERVICE TYPE CONFIG
================================================================ */

const SERVICE_TYPE_CONFIG: Record<
  Exclude<ServiceType, 'ALL'>,
  {
    label: string;

    icon: React.ComponentType<{
      className?: string;
    }>;
  }
> = {
  PMS: {
    label: 'PMS',
    icon: ClipboardList,
  },

  REPAIR: {
    label: 'Repair',
    icon: Wrench,
  },

  CHECKUP: {
    label: 'Checkup',
    icon: Gauge,
  },

  MODIFICATION: {
    label: 'Modification',
    icon: Settings2,
  },
};

/* ================================================================
   COMPONENT
================================================================ */

export default function BookingFormCard({
  customers,
  services,
  selectedDate,
  onSuccess,
  customersLoading = false,
  servicesLoading = false,
}: BookingFormCardProps) {
  /* ==============================================================
     APPOINTMENT FORM HOOK
  ============================================================== */

  const {
    form,

    vehicles,

    selectedCustomer,

    selectedVehicle,

    setSelectedCustomer,

    setSelectedVehicle,

    loadingVehicles,

    availableSlots,

    loadingAvailableSlots,

    isSubmitting,

    submitHandler,
  } =
    useAppointmentForm(
      customers,
      onSuccess,
    );

  /* ==============================================================
     LOCAL STATE
  ============================================================== */

  const [
    customerPickerOpen,
    setCustomerPickerOpen,
  ] = React.useState(false);

  const [
    vehiclePickerOpen,
    setVehiclePickerOpen,
  ] = React.useState(false);

  const [
    serviceSearch,
    setServiceSearch,
  ] = React.useState('');

  const [
    servicePopoverOpen,
    setServicePopoverOpen,
  ] = React.useState(false);

  const [
    serviceType,
    setServiceType,
  ] =
    React.useState<ServiceType>(
      'ALL',
    );

  /* ==============================================================
     FORM
  ============================================================== */

  const {
    register,
    setValue,
    watch,
    formState: {
      errors,
    },
  } = form;

  const watchCustomerId =
    watch(
      'customerId',
    );

  const watchVehicleId =
    watch(
      'vehicleId',
    );

  const watchServices =
    watch(
      'services',
    ) || [];

  const watchDate =
    watch(
      'appointmentDate',
    );

  const watchAppointmentTime =
    watch(
      'appointmentTime',
    );

  /* ==============================================================
     UPDATE DATE
  ============================================================== */

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

  /* ==============================================================
     CLOSE VEHICLE PICKER WHEN CUSTOMER IS CLEARED
  ============================================================== */

  React.useEffect(() => {
    if (
      !watchCustomerId
    ) {
      if (
        vehiclePickerOpen
      ) {
        setVehiclePickerOpen(
          false,
        );
      }

      if (
        selectedVehicle
      ) {
        setSelectedVehicle(
          null,
        );
      }

      if (
        watchVehicleId
      ) {
        setValue(
          'vehicleId',
          '',
          {
            shouldValidate:
              true,
          },
        );
      }
    }
  }, [
    watchCustomerId,
    watchVehicleId,
    selectedVehicle,
    vehiclePickerOpen,
    setSelectedVehicle,
    setValue,
  ]);

  /* ==============================================================
     FILTER SERVICES
  ============================================================== */

  const filteredServices =
    React.useMemo(() => {
      const normalizedSearch =
        serviceSearch
          .trim()
          .toLowerCase();

      return services.filter(
        (
          service,
        ) => {
          const normalizedType =
            (
              service.type ??
              'REPAIR'
            ).toUpperCase();

          const matchesType =
            serviceType ===
              'ALL' ||
            normalizedType ===
              serviceType;

          const matchesSearch =
            !normalizedSearch ||
            service.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          /*
           * Inactive services are not available for a new booking.
           */
          const matchesActive =
            service.active !==
              false;

          return (
            matchesType &&
            matchesSearch &&
            matchesActive
          );
        },
      );
    }, [
      services,
      serviceType,
      serviceSearch,
    ]);

  /* ==============================================================
     SELECT SERVICE
  ============================================================== */

  const toggleService =
    (
      serviceId: string,
    ) => {
      const current =
        watchServices || [];

      const newValue =
        current.includes(
          serviceId,
        )
          ? current.filter(
              (
                id,
              ) =>
                id !==
                serviceId,
            )
          : [
              ...current,
              serviceId,
            ];

      setValue(
        'services',
        newValue,
        {
          shouldValidate:
            true,

          shouldDirty:
            true,

          shouldTouch:
            true,
        },
      );
    };

  /* ==============================================================
     SERVICE TYPE CHANGE
  ============================================================== */

  const handleServiceTypeChange =
    (
      type: ServiceType,
    ) => {
      setServiceType(
        type,
      );
    };

  /* ==============================================================
     SUBMIT
  ============================================================== */

  const onSubmit =
    form.handleSubmit(
      submitHandler,
    );

  /* ==============================================================
     AVAILABLE SLOT SKELETON
  ============================================================== */

  const availableSlotSkeleton =
    Array.from({
      length: 6,
    });

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Card
      className="
        rounded-xl
        border-border
        bg-card
        text-card-foreground
        shadow-sm
      "
    >
      {/* ==========================================================
          HEADER
      =========================================================== */}

      <CardHeader
        className="
          border-b
          border-border
          px-4
          py-4

          md:px-5
        "
      >
        <CardTitle
          className="
            flex
            items-center
            gap-2
            text-base
            font-semibold
            tracking-tight
          "
        >
          <PlusCircle
            className="
              h-5
              w-5
              text-primary
            "
          />

          New Booking
        </CardTitle>

        <CardDescription
          className="
            text-xs
            leading-5
            text-muted-foreground
          "
        >
          {format(
            selectedDate,
            'MMM dd, yyyy',
          )}{' '}
          · Reserve a service slot for a
          customer.
        </CardDescription>
      </CardHeader>

      {/* ==========================================================
          CONTENT
      =========================================================== */}

      <CardContent
        className="
          p-4
          md:p-5
        "
      >
        <form
          onSubmit={
            onSubmit
          }
          className="
            space-y-5
          "
        >
          {/* ======================================================
              CUSTOMER / VEHICLE
          ======================================================= */}

          <div
            className="
              space-y-4
            "
          >
            {/* ====================================================
                CUSTOMER
            ===================================================== */}

            <div>
              <Label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-muted-foreground
                "
              >
                Customer
              </Label>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomerPickerOpen(
                    true,
                  )
                }
                disabled={
                  customersLoading
                }
                className="
                  h-11
                  w-full
                  justify-start
                  rounded-md
                  px-3
                  text-left
                  text-base
                  font-normal

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2

                  md:h-9
                  md:text-sm
                "
              >
                {customersLoading ? (
                  <>
                    <Loader2
                      className="
                        mr-2
                        h-4
                        w-4
                        animate-spin
                        text-muted-foreground
                      "
                    />

                    <span
                      className="
                        text-muted-foreground
                      "
                    >
                      Loading customers...
                    </span>
                  </>
                ) : watchCustomerId &&
                  selectedCustomer ? (
                  <span
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-2
                    "
                  >
                    <UserCircle
                      className="
                        h-4
                        w-4
                        shrink-0
                        text-primary
                      "
                    />

                    <span
                      className="
                        truncate
                        font-medium
                        text-foreground
                      "
                    >
                      {
                        selectedCustomer.fullname
                      }
                    </span>

                    {selectedCustomer.phone && (
                      <span
                        className="
                          hidden
                          truncate
                          text-xs
                          text-muted-foreground
                          sm:inline
                        "
                      >
                        (
                        {
                          selectedCustomer.phone
                        }
                        )
                      </span>
                    )}
                  </span>
                ) : (
                  <span
                    className="
                      truncate
                      text-muted-foreground
                    "
                  >
                    Identify customer…
                  </span>
                )}
              </Button>

              {errors.customerId && (
                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-destructive
                  "
                >
                  {
                    errors
                      .customerId
                      .message
                  }
                </p>
              )}
            </div>

            {/* ====================================================
                VEHICLE
            ===================================================== */}

            <div>
              <Label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-muted-foreground
                "
              >
                Vehicle
              </Label>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVehiclePickerOpen(
                    true,
                  )
                }
                disabled={
                  !watchCustomerId ||
                  loadingVehicles
                }
                className="
                  h-11
                  w-full
                  justify-start
                  rounded-md
                  px-3
                  text-left
                  text-base
                  font-normal

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2

                  md:h-9
                  md:text-sm
                "
              >
                {loadingVehicles ? (
                  <>
                    <Loader2
                      className="
                        mr-2
                        h-4
                        w-4
                        animate-spin
                        text-muted-foreground
                      "
                    />

                    <span
                      className="
                        text-muted-foreground
                      "
                    >
                      Loading vehicles...
                    </span>
                  </>
                ) : watchVehicleId &&
                  selectedVehicle ? (
                  <span
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-2
                    "
                  >
                    <Car
                      className="
                        h-4
                        w-4
                        shrink-0
                        text-primary
                      "
                    />

                    <span
                      className="
                        truncate
                        font-medium
                        text-foreground
                      "
                    >
                      {
                        selectedVehicle.make
                      }{' '}
                      {
                        selectedVehicle.model
                      }
                    </span>

                    {selectedVehicle.plateNumber && (
                      <span
                        className="
                          hidden
                          truncate
                          text-xs
                          text-muted-foreground
                          sm:inline
                        "
                      >
                        (
                        {
                          selectedVehicle.plateNumber
                        }
                        )
                      </span>
                    )}
                  </span>
                ) : (
                  <span
                    className="
                      truncate
                      text-muted-foreground
                    "
                  >
                    {watchCustomerId
                      ? 'Select vehicle…'
                      : 'Select customer first'}
                  </span>
                )}
              </Button>

              {errors.vehicleId && (
                <p
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-destructive
                  "
                >
                  {
                    errors
                      .vehicleId
                      .message
                  }
                </p>
              )}
            </div>
          </div>

          {/* ======================================================
              SERVICES
          ======================================================= */}

          <div>
            <Label
              className="
                mb-2
                block
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-muted-foreground
              "
            >
              Services
            </Label>

            <Popover
              open={
                servicePopoverOpen
              }
              onOpenChange={(
                nextOpen,
              ) => {
                setServicePopoverOpen(
                  nextOpen,
                );

                if (
                  !nextOpen
                ) {
                  setServiceSearch(
                    '',
                  );

                  setServiceType(
                    'ALL',
                  );
                }
              }}
            >
              <PopoverTrigger
                asChild
              >
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={
                    servicePopoverOpen
                  }
                  disabled={
                    servicesLoading
                  }
                  className="
                    h-11
                    w-full
                    justify-between
                    rounded-md
                    px-3
                    text-base
                    font-normal

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2

                    md:h-9
                    md:text-sm
                  "
                >
                  <span
                    className="
                      min-w-0
                      truncate
                    "
                  >
                    {servicesLoading
                      ? 'Loading services…'
                      : watchServices.length >
                          0
                        ? `${watchServices.length} service(s) selected`
                        : 'Select services…'}
                  </span>

                  <ChevronsUpDown
                    className="
                      ml-2
                      h-4
                      w-4
                      shrink-0
                      text-muted-foreground
                    "
                  />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={
                  4
                }
                className="
                  w-[var(--radix-popover-trigger-width)]
                  max-w-[calc(100vw-2rem)]
                  overflow-hidden
                  rounded-lg
                  p-0
                "
              >
                <Command
                  shouldFilter={
                    false
                  }
                  className="
                    w-full
                  "
                >
                  {/* =================================================
                      SEARCH
                  ================================================== */}

                  <CommandInput
                    placeholder="Search services..."
                    value={
                      serviceSearch
                    }
                    onValueChange={
                      setServiceSearch
                    }
                  />

                  {/* =================================================
                      SERVICE TYPE TABS
                      
                      IMPORTANT:
                      
                      This is intentionally a native horizontal
                      scrolling container rather than relying on
                      Radix CommandGroup scrolling.
                      
                      The tab row cannot wrap or shrink.
                  ================================================== */}

                  <div
                    className="
                      w-full
                      min-w-0
                      overflow-x-auto
                      overflow-y-hidden
                      overscroll-x-contain
                      border-b
                      border-border
                      px-2
                      py-2
                      touch-pan-x

                      [scrollbar-width:none]
                      [-webkit-overflow-scrolling:touch]
                      [&::-webkit-scrollbar]:hidden
                    "
                  >
                    <div
                      className="
                        flex
                        w-max
                        min-w-full
                        shrink-0
                        gap-1
                      "
                    >
                      {SERVICE_TYPES.map(
                        (
                          type,
                        ) => {
                          const Icon =
                            type ===
                            'ALL'
                              ? Layers3
                              : SERVICE_TYPE_CONFIG[
                                  type
                                ].icon;

                          const label =
                            type ===
                            'ALL'
                              ? 'All'
                              : SERVICE_TYPE_CONFIG[
                                  type
                                ].label;

                          const isActive =
                            serviceType ===
                            type;

                          return (
                            <button
                              key={
                                type
                              }
                              type="button"
                              tabIndex={
                                0
                              }
                              onClick={() =>
                                handleServiceTypeChange(
                                  type,
                                )
                              }
                              className={cn(
                                `
                                  inline-flex
                                  min-h-9
                                  shrink-0
                                  touch-manipulation
                                  select-none
                                  items-center
                                  justify-center
                                  gap-1.5
                                  rounded-md
                                  px-3
                                  text-xs
                                  font-semibold
                                  whitespace-nowrap
                                  transition-colors

                                  focus-visible:outline-none
                                  focus-visible:ring-2
                                  focus-visible:ring-ring
                                  focus-visible:ring-offset-1
                                `,
                                isActive
                                  ? `
                                    bg-primary
                                    text-primary-foreground
                                    shadow-sm
                                  `
                                  : `
                                    text-muted-foreground
                                    hover:bg-accent
                                    hover:text-foreground
                                  `,
                              )}
                            >
                              <Icon
                                className="
                                  h-3.5
                                  w-3.5
                                  shrink-0
                                "
                              />

                              <span>
                                {label}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      SERVICE LIST
                  ================================================== */}

                  {servicesLoading ? (
                    <div
                      className="
                        max-h-72
                        overflow-y-auto
                        overscroll-contain
                        p-2
                        [-webkit-overflow-scrolling:touch]
                      "
                    >
                      <div
                        className="
                          space-y-2
                        "
                      >
                        {Array.from({
                          length: 6,
                        }).map(
                          (
                            _,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="
                                flex
                                animate-pulse
                                items-center
                                gap-2
                                rounded-md
                                p-2.5
                              "
                            >
                              <div
                                className="
                                  h-4
                                  w-4
                                  shrink-0
                                  rounded
                                  bg-muted
                                "
                              />

                              <div
                                className="
                                  h-4
                                  flex-1
                                  rounded
                                  bg-muted
                                "
                              />

                              <div
                                className="
                                  h-3
                                  w-12
                                  shrink-0
                                  rounded
                                  bg-muted
                                "
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : filteredServices.length ===
                    0 ? (
                    <div
                      className="
                        flex
                        min-h-40
                        flex-col
                        items-center
                        justify-center
                        px-4
                        text-center
                      "
                    >
                      <Wrench
                        className="
                          mb-2
                          h-6
                          w-6
                          text-muted-foreground/50
                        "
                      />

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-muted-foreground
                        "
                      >
                        No service found.
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-muted-foreground
                        "
                      >
                        Try another service type or
                        search term.
                      </p>
                    </div>
                  ) : (
                    <CommandGroup
                      className="
                        max-h-72
                        overflow-y-auto
                        overscroll-contain

                        [-webkit-overflow-scrolling:touch]
                      "
                    >
                      {filteredServices.map(
                        (
                          service,
                        ) => {
                          const selected =
                            watchServices.includes(
                              service.id,
                            );

                          const type =
                            (
                              service.type ??
                              'REPAIR'
                            ).toUpperCase();

                          return (
                            <CommandItem
                              key={
                                service.id
                              }
                              value={
                                service.id
                              }
                              onSelect={() =>
                                toggleService(
                                  service.id,
                                )
                              }
                              className="
                                cursor-pointer
                                items-start
                                gap-2
                                py-2.5
                              "
                            >
                              <Check
                                className={cn(
                                  `
                                    mt-0.5
                                    h-4
                                    w-4
                                    shrink-0
                                  `,
                                  selected
                                    ? `
                                      opacity-100
                                      text-primary
                                    `
                                    : `
                                      opacity-0
                                    `,
                                )}
                              />

                              <div
                                className="
                                  min-w-0
                                  flex-1
                                "
                              >
                                <div
                                  className="
                                    flex
                                    min-w-0
                                    flex-wrap
                                    items-center
                                    gap-1.5
                                  "
                                >
                                  <span
                                    className="
                                      min-w-0
                                      truncate
                                      text-sm
                                      font-medium
                                    "
                                  >
                                    {
                                      service.name
                                    }
                                  </span>

                                  <span
                                    className={cn(
                                      `
                                        shrink-0
                                        rounded-full
                                        px-1.5
                                        py-0.5
                                        text-[9px]
                                        font-bold
                                        uppercase
                                        tracking-wider
                                      `,
                                      type ===
                                        'PMS' &&
                                        `
                                          bg-emerald-100
                                          text-emerald-800
                                          dark:bg-emerald-500/20
                                          dark:text-emerald-400
                                        `,
                                      type ===
                                        'REPAIR' &&
                                        `
                                          bg-primary/10
                                          text-primary
                                        `,
                                      type ===
                                        'CHECKUP' &&
                                        `
                                          bg-blue-100
                                          text-blue-800
                                          dark:bg-blue-500/20
                                          dark:text-blue-400
                                        `,
                                      type ===
                                        'MODIFICATION' &&
                                        `
                                          bg-purple-100
                                          text-purple-800
                                          dark:bg-purple-500/20
                                          dark:text-purple-400
                                        `,
                                      ![
                                        'PMS',
                                        'REPAIR',
                                        'CHECKUP',
                                        'MODIFICATION',
                                      ].includes(
                                        type as any,
                                      ) &&
                                        `
                                          bg-muted
                                          text-muted-foreground
                                        `,
                                    )}
                                  >
                                    {type}
                                  </span>
                                </div>

                                <span
                                  className="
                                    mt-0.5
                                    block
                                    text-[10px]
                                    text-muted-foreground
                                  "
                                >
                                  {
                                    service.estimatedDuration
                                  }{' '}
                                  min
                                </span>
                              </div>
                            </CommandItem>
                          );
                        },
                      )}
                    </CommandGroup>
                  )}
                </Command>
              </PopoverContent>
            </Popover>

            {errors.services && (
              <p
                className="
                  mt-1.5
                  text-xs
                  font-medium
                  text-destructive
                "
              >
                {
                  errors
                    .services
                    .message
                }
              </p>
            )}
          </div>

          {/* ======================================================
              NOTES
          ======================================================= */}

          <div>
            <Label
              className="
                mb-2
                block
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-muted-foreground
              "
            >
              Additional Notes
            </Label>

            <Textarea
              placeholder="e.g., Engine makes a ticking noise, AC not cooling, etc."
              className="
                min-h-[88px]
                rounded-md
                text-base

                focus-visible:ring-2
                focus-visible:ring-ring

                md:text-sm
              "
              {...register(
                'notes',
              )}
            />

            <p
              className="
                mt-1.5
                text-xs
                text-muted-foreground
              "
            >
              Let us know any special requests or
              symptoms.
            </p>
          </div>

          {/* ======================================================
              AVAILABLE SLOT
          ======================================================= */}

          <div>
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <Label
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-muted-foreground
                "
              >
                Available Slot
              </Label>

              {watchDate &&
                watchServices.length >
                  0 && (
                  <span
                    className="
                      shrink-0
                      text-[10px]
                      font-medium
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    {format(
                      selectedDate,
                      'MMM d',
                    )}
                  </span>
                )}
            </div>

            {/* ====================================================
                NO DATE / NO SERVICES
            ===================================================== */}

            {!watchDate ||
            watchServices.length ===
              0 ? (
              <div
                className="
                  rounded-lg
                  border
                  border-dashed
                  border-border
                  bg-muted/30
                  p-5
                  text-center
                "
              >
                <Clock
                  className="
                    mx-auto
                    mb-2
                    h-5
                    w-5
                    text-muted-foreground/50
                  "
                />

                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  {watchServices.length ===
                  0
                    ? 'Select date & services first'
                    : 'Select date first'}
                </p>
              </div>
            ) : loadingAvailableSlots ? (
              /* ====================================================
                 LOADING SKELETON
              ===================================================== */

              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                  sm:grid-cols-3
                "
                aria-label="Loading available appointment slots"
              >
                {availableSlotSkeleton.map(
                  (
                    _,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="
                        h-11
                        animate-pulse
                        rounded-md
                        bg-muted

                        md:h-9
                      "
                    />
                  ),
                )}
              </div>
            ) : availableSlots.length ===
              0 ? (
              /* ====================================================
                 NO SLOTS
              ===================================================== */

              <div
                className="
                  rounded-lg
                  border
                  border-dashed
                  border-destructive/30
                  bg-destructive/5
                  p-4
                  text-center
                "
              >
                <Clock
                  className="
                    mx-auto
                    mb-2
                    h-5
                    w-5
                    text-destructive/60
                  "
                />

                <p
                  className="
                    text-sm
                    font-medium
                    text-destructive
                  "
                >
                  No slots available for this
                  date.
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Try another date or select
                  another service.
                </p>
              </div>
            ) : (
              /* ====================================================
                 PRESET SLOTS ONLY
                 
                 Custom time has been completely removed.
              ===================================================== */

              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                  sm:grid-cols-3
                "
              >
                {availableSlots.map(
                  (
                    slot,
                  ) => {
                    const isSelected =
                      watchAppointmentTime ===
                      slot.time;

                    return (
                      <button
                        type="button"
                        key={
                          slot.time
                        }
                        disabled={
                          !slot.available
                        }
                        onClick={() => {
                          if (
                            !slot.available
                          ) {
                            return;
                          }

                          setValue(
                            'appointmentTime',
                            slot.time,
                            {
                              shouldValidate:
                                true,

                              shouldDirty:
                                true,

                              shouldTouch:
                                true,
                            },
                          );
                        }}
                        aria-pressed={
                          isSelected
                        }
                        className={cn(
                          `
                            flex
                            h-11
                            items-center
                            justify-center
                            rounded-md
                            px-3
                            text-xs
                            font-semibold
                            uppercase
                            tracking-wide
                            transition-colors

                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2

                            md:h-9
                          `,
                          isSelected
                            ? `
                              bg-primary
                              text-primary-foreground
                              shadow-sm
                            `
                            : slot.available
                              ? `
                                border
                                border-border
                                bg-card
                                text-foreground
                                hover:border-primary/40
                                hover:bg-primary/5
                              `
                              : `
                                cursor-not-allowed
                                border
                                border-border/60
                                bg-muted/50
                                text-muted-foreground/60
                                line-through
                              `,
                        )}
                      >
                        {formatTime12h(
                          slot.time,
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* ======================================================
              SUBMIT
          ======================================================= */}

          <Button
            type="submit"
            disabled={
              isSubmitting ||
              customersLoading ||
              servicesLoading ||
              loadingVehicles
            }
            className="
              h-11
              w-full
              rounded-md
              text-sm
              font-semibold

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2

              md:h-9
            "
          >
            {isSubmitting ? (
              <Loader2
                className="
                  mr-2
                  h-4
                  w-4
                  animate-spin
                "
              />
            ) : (
              <CheckCircle
                className="
                  mr-2
                  h-4
                  w-4
                "
              />
            )}

            Add Appointment
          </Button>
        </form>
      </CardContent>

      {/* ==========================================================
          CUSTOMER PICKER
      =========================================================== */}

      <CustomerPickerModal
        open={
          customerPickerOpen
        }
        onOpenChange={
          setCustomerPickerOpen
        }
        customers={
          customers
        }
        loading={
          customersLoading
        }
        onSelect={(
          customer,
        ) => {
          /*
           * Synchronize customer selection.
           */
          setSelectedCustomer(
            customer,
          );

          setValue(
            'customerId',
            customer.id,
            {
              shouldValidate:
                true,

              shouldDirty:
                true,

              shouldTouch:
                true,
            },
          );

          /*
           * Never retain a vehicle from the previous customer.
           */
          setSelectedVehicle(
            null,
          );

          setValue(
            'vehicleId',
            '',
            {
              shouldValidate:
                true,

              shouldDirty:
                true,

              shouldTouch:
                true,
            },
          );

          /*
           * Vehicle loading will automatically start through
           * useAppointmentForm because customerId changed.
           */
          setVehiclePickerOpen(
            false,
          );
        }}
        selectedCustomerId={
          watchCustomerId
        }
      />

      {/* ==========================================================
          VEHICLE PICKER
      =========================================================== */}

      <VehiclePickerModal
        open={
          vehiclePickerOpen
        }
        onOpenChange={
          setVehiclePickerOpen
        }
        vehicles={
          vehicles
        }
        loading={
          loadingVehicles
        }
        onSelect={(
          vehicle,
        ) => {
          setSelectedVehicle(
            vehicle,
          );

          setValue(
            'vehicleId',
            vehicle.id,
            {
              shouldValidate:
                true,

              shouldDirty:
                true,

              shouldTouch:
                true,
            },
          );
        }}
        selectedVehicleId={
          watchVehicleId
        }
        customerName={
          selectedCustomer?.fullname
        }
      />
    </Card>
  );
}