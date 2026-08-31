import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import { Clock, Undo2 } from 'lucide-react';

interface UnholdConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingFee: number;
  rate: number;
  unit: string;
  startedAt: string;
  onConfirm: () => void;
  loading?: boolean;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function UnholdConfirmModal({
  open,
  onOpenChange,
  parkingFee,
  rate,
  unit,
  startedAt,
  onConfirm,
  loading,
}: UnholdConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100%-1rem)] rounded-xl border border-border
          bg-card shadow-2xl sm:max-w-md
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Undo2 className="h-5 w-5 text-primary" />
            Remove Hold
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            This bill has been on hold since{' '}
            {format(
              new Date(startedAt),
              'MMM dd, yyyy hh:mm a'
            )}
            .
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Parking Fee Due
            </div>

            <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
              ₱{formatCurrency(parkingFee)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Rate: ₱{formatCurrency(rate)} per {unit}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            This fee will be added to the final bill. Do you want to continue?
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-11 w-full rounded-md bg-primary md:h-9 md:w-auto ${focusClass}`}
          >
            {loading ? 'Processing...' : 'Confirm & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}