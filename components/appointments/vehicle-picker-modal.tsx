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
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Select Vehicle
              {customerName && (
                <span className="text-sm font-medium text-muted-foreground ml-2">
                  for {customerName}
                </span>
              )}
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
              placeholder="Search by make, model, plate, or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">No vehicles found</p>
              <p className="text-xs text-muted-foreground">
                {customerName
                  ? `This customer has no registered vehicles.`
                  : "Please select a customer first."}
              </p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-bold text-muted-foreground">No matching vehicles</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelect(vehicle)}
                  className={cn(
                    "group relative p-4 rounded-2xl border-2 transition-all text-left hover:shadow-md active:scale-[0.98]",
                    selectedVehicleId === vehicle.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  {selectedVehicleId === vehicle.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {vehicle.year}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
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