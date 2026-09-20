'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { CarFront, CircleParking, Info, Loader2, ShieldCheck, X } from 'lucide-react';

interface ParkVehicleConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingFeePerDay: number;
  onConfirm: (addParkingFee: boolean) => Promise<void> | void;
  loading?: boolean;
}

export default function ParkVehicleConfirmationModal({
  open,
  onOpenChange,
  parkingFeePerDay,
  onConfirm,
  loading = false,
}: ParkVehicleConfirmationModalProps) {
  const [addParkingFee, setAddParkingFee] = useState(parkingFeePerDay > 0);

  useEffect(() => {
    if (open) {
      setAddParkingFee(parkingFeePerDay > 0);
    }
  }, [open, parkingFeePerDay]);

  const handleConfirm = async () => {
    await onConfirm(addParkingFee && parkingFeePerDay > 0);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-xl rounded-2xl border border-border bg-card p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border p-5 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <CircleParking className="h-5 w-5 text-primary" />
            Park Vehicle?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Are you sure the customer wants to park the vehicle at the service center?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <CarFront className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Vehicle will be marked as Parked</p>
                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  Parking time starts now. When parking is stopped, the system calculates the final parking fee using whole billable days and adds it to the Final Cost fees.
                </p>
              </div>
            </div>
          </div>

          <Card
            className={`rounded-xl border ${
              parkingFeePerDay > 0 ? 'border-primary/25 bg-primary/[0.03]' : 'border-border bg-muted/20'
            }`}
          >
            <CardContent className="p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={addParkingFee && parkingFeePerDay > 0}
                  disabled={parkingFeePerDay <= 0 || loading}
                  onCheckedChange={(checked) => setAddParkingFee(checked === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Add Parking Fee of ₱{parkingFeePerDay.toFixed(2)} / day
                    </p>
                    {parkingFeePerDay <= 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {parkingFeePerDay > 0
                      ? 'Any partial parking day is counted as one billable day.'
                      : 'Set a Parking Fee in Payments Configuration to enable parking charges.'}
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-5 text-muted-foreground">
              The configured rate is copied to this parking session when the vehicle is parked, so later configuration changes do not change an active session.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            className="h-11 w-full rounded-md sm:w-auto md:h-9"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Confirm Parking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
