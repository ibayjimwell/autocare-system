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
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Select Customer
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">No customers found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className={cn(
                    "group relative p-4 rounded-2xl border-2 transition-all text-left hover:shadow-md active:scale-[0.98]",
                    selectedCustomerId === customer.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  {selectedCustomerId === customer.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {customer.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">{customer.fullname}</p>
                      <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{customer.phone}</span>
                        </span>
                      </div>
                      {customer.deactivated && (
                        <Badge variant="secondary" className="mt-1 text-[10px] bg-red-100 text-red-700 border-red-200">
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

        <div className="p-4 border-t bg-muted/5 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl font-bold"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}