'use client';

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, User, Mail, Phone, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  deactivated?: boolean;
}

interface CustomerPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: string;
}

export default function CustomerPickerModal({
  open,
  onOpenChange,
  customers,
  onSelect,
  selectedCustomerId,
}: CustomerPickerModalProps) {
  const [search, setSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(customers);

  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredCustomers(customers);
    } else {
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.fullname.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone.includes(term)
        )
      );
    }
  }, [search, customers]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full-screen sheet on mobile (rounded-none), centered card from sm up */}
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-2xl sm:rounded-xl">
        {/* ---- Header: title + search ---- */}
        <DialogHeader className="shrink-0 space-y-3 border-b border-border p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <User className="h-5 w-5 text-primary" />
              Select Customer
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="h-11 w-11 rounded-md md:h-9 md:w-9"
            >
              <X className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-md pl-11 text-base md:h-9 md:pl-10 md:text-sm"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* ---- Options ---- */}
        <ScrollArea className="min-h-0 flex-1 p-4 md:p-6">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <User className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No customers found</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className={cn(
                    "relative rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedCustomerId === customer.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                      : "border-border hover:border-primary/40 hover:bg-accent/50",
                  )}
                >
                  {selectedCustomerId === customer.id && (
                    <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  )}
                  <div className="flex items-start gap-3 pr-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {customer.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{customer.fullname}</p>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{customer.phone}</span>
                        </span>
                      </div>
                      {customer.deactivated && (
                        <Badge
                          variant="outline"
                          className="mt-2 rounded-full border-destructive/25 bg-destructive/10 px-2 text-[10px] font-semibold text-destructive"
                        >
                          Deactivated
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* ---- Footer ---- */}
        <div className="shrink-0 border-t border-border p-3 md:p-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-md text-sm font-medium md:h-9"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}