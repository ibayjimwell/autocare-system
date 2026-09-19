'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircleParking, Clock3, Loader2, ReceiptText, X } from 'lucide-react';

interface StopParkingConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingFee: number;
  billableDays: number;
  rate: number;
  parkedAt?: string | null;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export default function StopParkingConfirmationModal({
  open,
  onOpenChange,
  parkingFee,
  billableDays,
  rate,
  parkedAt,
  onConfirm,
  loading = false,
}: StopParkingConfirmationModalProps) {
  const safeDate = parkedAt ? new Date(parkedAt) : null;
  const formattedDate = safeDate && !Number.isNaN(safeDate.getTime()) ? format(safeDate, 'MMM dd, yyyy h:mm a') : 'N/A';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-xl rounded-2xl border border-border bg-card p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border p-5 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <CircleParking className="h-5 w-5 text-primary" />
            Stop Parking?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Confirm that the vehicle is leaving the parking state. The system will add the calculated parking charge to the Final Bill fees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5 sm:p-6">
          <Card className="rounded-xl border-primary/20 bg-primary/[0.03]">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Billable Days</p>
                <p className="mt-1 text-xl font-bold text-foreground">{billableDays}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rate / Day</p>
                <p className="mt-1 text-xl font-bold text-foreground">₱{rate.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parking Fee</p>
                <p className="mt-1 text-xl font-bold text-primary">₱{parkingFee.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Parking started</p>
                <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              This action ends parking and permanently adds the calculated parking fee as a Final Bill fee. The bill then returns to Pending so staff can send the final cost when ready.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 p-4 sm:p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-11 w-full rounded-md sm:w-auto md:h-9">
            <X className="mr-2 h-4 w-4" />
            Keep Parked
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={loading} className="h-11 w-full rounded-md sm:w-auto md:h-9">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleParking className="mr-2 h-4 w-4" />}
            Stop Parking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
