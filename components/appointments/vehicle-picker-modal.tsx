'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Input,
} from '@/components/ui/input';

import {
  Button,
} from '@/components/ui/button';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Search,
  Car,
  CheckCircle,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

/* ================================================================
   VEHICLE TYPE
================================================================ */

export interface Vehicle {
  id: string;

  make: string;

  model: string;

  year: number;

  plateNumber: string;
}

/* ================================================================
   PROPS
================================================================ */

interface VehiclePickerModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  vehicles: Vehicle[];

  loading?: boolean;

  onSelect: (
    vehicle: Vehicle,
  ) => void;

  selectedVehicleId?: string;

  customerName?: string;
}

/* ================================================================
   SKELETON CARD
================================================================ */

function VehicleSkeletonCard() {
  return (
    <div
      className="
        animate-pulse
        rounded-lg
        border
        border-border
        bg-card
        p-4
      "
      aria-hidden="true"
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <div
          className="
            h-10
            w-10
            shrink-0
            rounded-full
            bg-muted
          "
        />

        <div
          className="
            min-w-0
            flex-1
            space-y-2
          "
        >
          <div
            className="
              h-4
              w-3/5
              rounded
              bg-muted
            "
          />

          <div
            className="
              flex
              gap-2
            "
          >
            <div
              className="
                h-5
                w-12
                rounded
                bg-muted
              "
            />

            <div
              className="
                h-5
                w-20
                rounded
                bg-muted
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETON LIST
================================================================ */

function VehiclePickerSkeleton() {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-3
        sm:grid-cols-2
      "
      aria-label="Loading vehicles"
    >
      {Array.from({
        length: 6,
      }).map(
        (
          _,
          index,
        ) => (
          <VehicleSkeletonCard
            key={
              index
            }
          />
        ),
      )}
    </div>
  );
}

/* ================================================================
   EMPTY STATE
================================================================ */

function VehicleEmptyState({
  customerName,
  hasSearch,
}: {
  customerName?: string;

  hasSearch: boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-60
        flex-col
        items-center
        justify-center
        px-4
        text-center
      "
    >
      <div
        className="
          mb-4
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          bg-muted
        "
      >
        <Car
          className="
            h-7
            w-7
            text-muted-foreground/60
          "
        />
      </div>

      <p
        className="
          text-sm
          font-semibold
          text-muted-foreground
        "
      >
        {hasSearch
          ? 'No matching vehicles'
          : 'No vehicles found'}
      </p>

      <p
        className="
          mt-1
          max-w-sm
          text-xs
          leading-5
          text-muted-foreground
        "
      >
        {hasSearch
          ? 'Try adjusting your search term.'
          : customerName
            ? 'This customer has no registered vehicles.'
            : 'Please select a customer first.'}
      </p>
    </div>
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function VehiclePickerModal({
  open,
  onOpenChange,
  vehicles,
  loading = false,
  onSelect,
  selectedVehicleId,
  customerName,
}: VehiclePickerModalProps) {
  const [
    search,
    setSearch,
  ] = useState('');

  /* ==============================================================
     RESET SEARCH
  ============================================================== */

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [
    open,
  ]);

  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredVehicles =
    useMemo(() => {
      const term =
        search
          .toLowerCase()
          .trim();

      if (!term) {
        return vehicles;
      }

      return vehicles.filter(
        (
          vehicle,
        ) =>
          vehicle.make
            .toLowerCase()
            .includes(term) ||
          vehicle.model
            .toLowerCase()
            .includes(term) ||
          vehicle.plateNumber
            .toLowerCase()
            .includes(term) ||
          String(
            vehicle.year,
          ).includes(term),
      );
    }, [
      search,
      vehicles,
    ]);

  /* ==============================================================
     SELECT
  ============================================================== */

  const handleSelect =
    (
      vehicle: Vehicle,
    ) => {
      onSelect(
        vehicle,
      );

      onOpenChange(
        false,
      );

      setSearch('');
    };

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <Dialog
      open={
        open
      }
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent
        /*
         * IMPORTANT:
         *
         * There is deliberately no manually-created close button.
         * DialogContent supplies the single X.
         */
        className="
          flex
          h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-none
          flex-col
          gap-0
          overflow-hidden
          rounded-xl
          p-0

          sm:h-auto
          sm:max-h-[92vh]
          sm:w-full
          sm:max-w-2xl
        "
      >
        {/* ========================================================
            HEADER
        ========================================================= */}

        <DialogHeader
          className="
            shrink-0
            space-y-3
            border-b
            border-border
            bg-background/80
            p-4
            pr-14
            backdrop-blur-xl

            sm:bg-card
            sm:backdrop-blur-none

            md:p-5
            md:pr-14
          "
        >
          <DialogTitle
            className="
              flex
              min-w-0
              items-center
              gap-x-2
              gap-y-1
              text-lg
              font-semibold
              tracking-tight
            "
          >
            <Car
              className="
                h-5
                w-5
                shrink-0
                text-primary
              "
            />

            <span className="truncate">
              Select Vehicle
            </span>

            {customerName && (
              <span
                className="
                  min-w-0
                  truncate
                  text-sm
                  font-normal
                  text-muted-foreground
                "
              >
                for {customerName}
              </span>
            )}
          </DialogTitle>

          {/* ======================================================
              SEARCH
          ======================================================= */}

          <div
            className="
              relative
            "
          >
            <Search
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                h-5
                w-5
                -translate-y-1/2
                text-muted-foreground

                md:h-4
                md:w-4
              "
            />

            <Input
              placeholder="Search by make, model, plate, or year..."
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              className="
                h-11
                rounded-md
                pl-11
                text-base

                focus-visible:ring-2
                focus-visible:ring-ring

                md:h-9
                md:pl-10
                md:text-sm
              "
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* ========================================================
            SCROLLABLE CONTENT
        ========================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            p-4
            [scrollbar-gutter:stable]
            [-webkit-overflow-scrolling:touch]

            md:p-5
          "
        >
          {loading ? (
            <VehiclePickerSkeleton />
          ) : filteredVehicles.length ===
            0 ? (
            <VehicleEmptyState
              customerName={
                customerName
              }
              hasSearch={
                search.trim().length >
                0
              }
            />
          ) : (
            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >
              {filteredVehicles.map(
                (
                  vehicle,
                ) => {
                  const isSelected =
                    selectedVehicleId ===
                    vehicle.id;

                  return (
                    <button
                      type="button"
                      key={
                        vehicle.id
                      }
                      disabled={
                        loading
                      }
                      onClick={() =>
                        handleSelect(
                          vehicle,
                        )
                      }
                      className={cn(
                        `
                          relative
                          w-full
                          rounded-lg
                          border
                          p-4
                          text-left
                          transition-colors

                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        `,
                        isSelected
                          ? `
                            border-primary
                            bg-primary/5
                            ring-1
                            ring-primary/25
                          `
                          : `
                            border-border
                            hover:border-primary/40
                            hover:bg-accent/50
                          `,
                      )}
                    >
                      {/* ==========================================
                          SELECTED
                      =========================================== */}

                      {isSelected && (
                        <CheckCircle
                          className="
                            absolute
                            right-3
                            top-3
                            h-5
                            w-5
                            text-primary
                          "
                        />
                      )}

                      {/* ==========================================
                          CONTENT
                      =========================================== */}

                      <div
                        className="
                          flex
                          items-start
                          gap-3
                          pr-6
                        "
                      >
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Car
                            className="
                              h-5
                              w-5
                            "
                          />
                        </div>

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-foreground
                            "
                          >
                            {
                              vehicle.make
                            }{' '}
                            {
                              vehicle.model
                            }
                          </p>

                          <div
                            className="
                              mt-1.5
                              flex
                              flex-wrap
                              gap-2
                            "
                          >
                            <Badge
                              variant="outline"
                              className="
                                rounded-md
                                text-[10px]
                                font-medium
                                text-muted-foreground
                              "
                            >
                              {
                                vehicle.year
                              }
                            </Badge>

                            <Badge
                              variant="outline"
                              className="
                                rounded-md
                                border-primary/25
                                bg-primary/5
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wide
                                text-primary
                              "
                            >
                              {
                                vehicle.plateNumber
                              }
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <div
          className="
            shrink-0
            border-t
            border-border
            p-3
            md:p-4
          "
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onOpenChange(
                false,
              )
            }
            className="
              h-11
              w-full
              rounded-md
              text-sm
              font-medium

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2

              md:h-9
            "
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}