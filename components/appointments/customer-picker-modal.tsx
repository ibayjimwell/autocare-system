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
  User,
  Mail,
  Phone,
  CheckCircle,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

/* ================================================================
   CUSTOMER TYPE
================================================================ */

export interface Customer {
  id: string;

  fullname:
    | string
    | null;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  deactivated?: boolean;
}

/* ================================================================
   PROPS
================================================================ */

interface CustomerPickerModalProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  customers: Customer[];

  loading?: boolean;

  onSelect: (
    customer: Customer,
  ) => void;

  selectedCustomerId?: string;
}

/* ================================================================
   SKELETON CARD
================================================================ */

function CustomerSkeletonCard() {
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
              h-3
              w-4/5
              rounded
              bg-muted
            "
          />

          <div
            className="
              h-3
              w-2/5
              rounded
              bg-muted
            "
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SKELETON LIST
================================================================ */

function CustomerPickerSkeleton() {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-3
        sm:grid-cols-2
      "
      aria-label="Loading customers"
    >
      {Array.from({
        length: 6,
      }).map(
        (
          _,
          index,
        ) => (
          <CustomerSkeletonCard
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

function CustomerEmptyState({
  hasSearch,
}: {
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
        <User
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
          ? 'No customers found'
          : 'No customers available'}
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
          : 'There are currently no customer records to select.'}
      </p>
    </div>
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function CustomerPickerModal({
  open,
  onOpenChange,
  customers,
  loading = false,
  onSelect,
  selectedCustomerId,
}: CustomerPickerModalProps) {
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

  const filteredCustomers =
    useMemo(() => {
      const term =
        search
          .toLowerCase()
          .trim();

      if (!term) {
        return customers;
      }

      return customers.filter(
        (
          customer,
        ) => {
          const fullname =
            customer.fullname ??
            '';

          const email =
            customer.email ??
            '';

          const phone =
            customer.phone ??
            '';

          return (
            fullname
              .toLowerCase()
              .includes(
                term,
              ) ||
            email
              .toLowerCase()
              .includes(
                term,
              ) ||
            phone
              .toLowerCase()
              .includes(
                term,
              )
          );
        },
      );
    }, [
      customers,
      search,
    ]);

  /* ==============================================================
     SELECT
  ============================================================== */

  const handleSelect =
    (
      customer: Customer,
    ) => {
      onSelect(
        customer,
      );

      onOpenChange(
        false,
      );

      setSearch('');
    };

  /* ==============================================================
     INITIAL
  ============================================================== */

  const getCustomerInitial =
    (
      fullname:
        | string
        | null
        | undefined,
    ) => {
      const name =
        (
          fullname ??
          ''
        ).trim();

      if (!name) {
        return '?';
      }

      return name
        .charAt(0)
        .toUpperCase();
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
         * No custom X is rendered inside this component.
         *
         * shadcn/Radix DialogContent provides one close button.
         *
         * pr-14 reserves space for that single button.
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
              gap-2
              text-lg
              font-semibold
              tracking-tight
            "
          >
            <User
              className="
                h-5
                w-5
                shrink-0
                text-primary
              "
            />

            <span className="truncate">
              Select Customer
            </span>
          </DialogTitle>

          {/* ======================================================
              SEARCH
          ======================================================= */}

          <div
            className="
              relative
              w-full
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
              placeholder="Search by name, email, or phone..."
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
            <CustomerPickerSkeleton />
          ) : filteredCustomers.length ===
            0 ? (
            <CustomerEmptyState
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
              {filteredCustomers.map(
                (
                  customer,
                ) => {
                  const fullname =
                    customer.fullname ??
                    '';

                  const email =
                    customer.email ??
                    '';

                  const phone =
                    customer.phone ??
                    '';

                  const isSelected =
                    selectedCustomerId ===
                    customer.id;

                  return (
                    <button
                      type="button"
                      key={
                        customer.id
                      }
                      disabled={
                        loading
                      }
                      onClick={() =>
                        handleSelect(
                          customer,
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
                        customer.deactivated &&
                          'opacity-70',
                      )}
                    >
                      {/* ==========================================
                          SELECTED INDICATOR
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
                          CUSTOMER CONTENT
                      =========================================== */}

                      <div
                        className="
                          flex
                          items-start
                          gap-3
                          pr-6
                        "
                      >
                        {/* ========================================
                            AVATAR
                        ========================================= */}

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
                            text-sm
                            font-semibold
                            text-primary
                          "
                        >
                          {getCustomerInitial(
                            fullname,
                          )}
                        </div>

                        {/* ========================================
                            INFORMATION
                        ========================================= */}

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
                            {fullname ||
                              'Unnamed Customer'}
                          </p>

                          <div
                            className="
                              mt-1
                              flex
                              flex-col
                              gap-1
                              text-xs
                              text-muted-foreground
                            "
                          >
                            <span
                              className="
                                flex
                                min-w-0
                                items-center
                                gap-1
                              "
                            >
                              <Mail
                                className="
                                  h-3
                                  w-3
                                  shrink-0
                                "
                              />

                              <span className="truncate">
                                {email ||
                                  'No email'}
                              </span>
                            </span>

                            <span
                              className="
                                flex
                                items-center
                                gap-1
                              "
                            >
                              <Phone
                                className="
                                  h-3
                                  w-3
                                  shrink-0
                                "
                              />

                              <span>
                                {phone ||
                                  'No phone'}
                              </span>
                            </span>
                          </div>

                          {customer.deactivated && (
                            <Badge
                              variant="outline"
                              className="
                                mt-2
                                rounded-full
                                border-destructive/25
                                bg-destructive/10
                                px-2
                                text-[10px]
                                font-semibold
                                text-destructive
                              "
                            >
                              Deactivated
                            </Badge>
                          )}
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