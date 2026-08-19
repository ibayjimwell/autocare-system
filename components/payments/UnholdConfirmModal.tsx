import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';

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
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Remove Hold</DialogTitle>
          <p className="text-sm text-muted-foreground">This bill has been on hold since {format(new Date(startedAt), 'MMM dd, yyyy hh:mm a')}.</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Parking Fee Due</p>
            <p className="text-3xl font-black text-primary">₱{formatCurrency(parkingFee)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Rate: ₱{formatCurrency(rate)} per {unit}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            This fee will be added to the final bill. Do you want to continue?
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 font-bold">
            {loading ? 'Processing...' : 'Confirm & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}