'use client';

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Car, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface VehiclePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  onSelect: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  customerName?: string;
}

export default function VehiclePickerModal({
  open,
  onOpenChange,
  vehicles,
  onSelect,
  selectedVehicleId,
  customerName,
}: VehiclePickerModalProps) {
  const [search, setSearch] = useState("");
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(vehicles);

  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredVehicles(vehicles);
    } else {
      setFilteredVehicles(
        vehicles.filter(
          (v) =>
            v.make.toLowerCase().includes(term) ||
            v.model.toLowerCase().includes(term) ||
            v.plateNumber.toLowerCase().includes(term) ||
            String(v.year).includes(term)
        )
      );
    }
  }, [search, vehicles]);

  const handleSelect = (vehicle: Vehicle) => {
    onSelect(vehicle);
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
            <DialogTitle className="flex flex-wrap items-center gap-x-2 text-lg font-semibold tracking-tight text-foreground">
              <Car className="h-5 w-5 text-primary" />
              Select Vehicle
              {customerName && (
                <span className="text-sm font-normal text-muted-foreground">
                  for {customerName}
                </span>
              )}
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
              placeholder="Search by make, model, plate, or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-md pl-11 text-base md:h-9 md:pl-10 md:text-sm"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* ---- Options ---- */}
        <ScrollArea className="min-h-0 flex-1 p-4 md:p-6">
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Car className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No vehicles found</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {customerName
                  ? `This customer has no registered vehicles.`
                  : "Please select a customer first."}
              </p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No matching vehicles</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelect(vehicle)}
                  className={cn(
                    "relative rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedVehicleId === vehicle.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                      : "border-border hover:border-primary/40 hover:bg-accent/50",
                  )}
                >
                  {selectedVehicleId === vehicle.id && (
                    <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  )}
                  <div className="flex items-start gap-3 pr-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-md text-[10px] font-medium text-muted-foreground">
                          {vehicle.year}
                        </Badge>
                        <Badge variant="outline" className="rounded-md border-primary/25 bg-primary/5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {vehicle.plateNumber}
                        </Badge>
                      </div>
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