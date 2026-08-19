import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface HoldConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rate: number, unit: string) => void;
  loading?: boolean;
}

export default function HoldConfigModal({ open, onOpenChange, onConfirm, loading }: HoldConfigModalProps) {
  const [rate, setRate] = useState<number>(5);
  const [unit, setUnit] = useState<string>('hour');

  const handleConfirm = () => {
    if (rate > 0) {
      onConfirm(rate, unit);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Hold & Apply Parking Fee</DialogTitle>
          <p className="text-sm text-muted-foreground">Set the parking fee rate for this hold period.</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fee Rate</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">Per Minute</SelectItem>
                <SelectItem value="hour">Per Hour</SelectItem>
                <SelectItem value="day">Per Day</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">The fee will be calculated based on the elapsed time from now until the hold is removed.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading || rate <= 0} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold">
            {loading ? 'Holding...' : 'Confirm Hold'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}