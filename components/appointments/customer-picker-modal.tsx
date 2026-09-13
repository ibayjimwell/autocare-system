'use client';

import React, {
  useState,
  useEffect,
} from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import {
  Search,
  User,
  Mail,
  Phone,
  CheckCircle,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/* ================================================================
   CUSTOMER TYPE
================================================================ */

interface Customer {
  id: string;

  /*
   * Name is expected to exist, but we still handle null/undefined
   * safely because this data comes from the API.
   */
  fullname: string | null;

  /*
   * Email is optional in the customer system.
   */
  email: string | null;

  /*
   * Phone may also be nullable depending on the API/database data.
   */
  phone: string | null;

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

  onSelect: (
    customer: Customer,
  ) => void;

  selectedCustomerId?: string;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function CustomerPickerModal({
  open,
  onOpenChange,
  customers,
  onSelect,
  selectedCustomerId,
}: CustomerPickerModalProps) {
  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filteredCustomers,
    setFilteredCustomers,
  ] =
    useState<Customer[]>(
      customers,
    );

  /* ==============================================================
     FILTER CUSTOMERS
     
     IMPORTANT:
     
     fullname/email/phone can contain null values.
     
     We normalize each value to an empty string before calling
     toLowerCase(), includes(), or other string methods.
  ============================================================== */

  useEffect(() => {
    const term =
      search
        .toLowerCase()
        .trim();

    /*
     * No search term:
     * show the complete customer list.
     */
    if (!term) {
      setFilteredCustomers(
        customers,
      );

      return;
    }

    /*
     * Search:
     *
     * - fullname
     * - email
     * - phone
     *
     * All fields are safely converted to strings.
     */
    const filtered =
      customers.filter(
        (customer) => {
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

    setFilteredCustomers(
      filtered,
    );
  }, [
    search,
    customers,
  ]);

  /* ==============================================================
     SELECT CUSTOMER
  ============================================================== */

  const handleSelect = (
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
     CUSTOMER DISPLAY HELPERS
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
        className="
          flex
          max-h-[100dvh]
          flex-col
          gap-0
          overflow-hidden
          rounded-none
          p-0
          sm:max-h-[92vh]
          sm:max-w-2xl
          sm:rounded-xl
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
            backdrop-blur-xl
            sm:bg-card
            sm:backdrop-blur-none
            md:p-5
          "
        >
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <User className="h-5 w-5 text-primary" />

              Select Customer
            </DialogTitle>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              aria-label="Close"
              className="
                h-11
                w-11
                rounded-md
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9
                md:w-9
              "
            >
              <X className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>

          {/* ======================================================
              SEARCH
          ======================================================= */}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />

            <Input
              placeholder="Search by name, email, or phone..."
              value={
                search
              }
              onChange={(
                e,
              ) =>
                setSearch(
                  e.target
                    .value,
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
            CUSTOMER LIST
        ========================================================= */}

        <ScrollArea className="min-h-0 flex-1 p-4 md:p-5">
          {filteredCustomers.length ===
          0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <User className="h-7 w-7 text-muted-foreground/60" />
              </div>

              <p className="text-sm font-semibold text-muted-foreground">
                No customers found
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search
                term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      onClick={() =>
                        handleSelect(
                          customer,
                        )
                      }
                      className={cn(
                        `
                          relative
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
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                          : 'border-border hover:border-primary/40 hover:bg-accent/50',
                      )}
                    >
                      {/* ==========================================
                          SELECTED INDICATOR
                      =========================================== */}

                      {isSelected && (
                        <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                      )}

                      <div className="flex items-start gap-3 pr-6">
                        {/* ========================================
                            AVATAR
                        ========================================= */}

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {getCustomerInitial(
                            fullname,
                          )}
                        </div>

                        {/* ========================================
                            CUSTOMER INFORMATION
                        ========================================= */}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {fullname ||
                              'Unnamed Customer'}
                          </p>

                          <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
                            {/* ====================================
                                EMAIL
                            ===================================== */}

                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />

                              <span className="truncate">
                                {email ||
                                  'No email'}
                              </span>
                            </span>

                            {/* ====================================
                                PHONE
                            ===================================== */}

                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />

                              <span>
                                {phone ||
                                  'No phone'}
                              </span>
                            </span>
                          </div>

                          {/* ======================================
                              DEACTIVATED
                          ======================================= */}

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
        </ScrollArea>

        {/* ========================================================
            FOOTER
        ========================================================= */}

        <div className="shrink-0 border-t border-border p-3 md:p-4">
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