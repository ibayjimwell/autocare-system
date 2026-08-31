import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PauseCircle } from 'lucide-react';
import { useState } from 'react';

interface HoldConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rate: number, unit: string) => void;
  loading?: boolean;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function HoldConfigModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: HoldConfigModalProps) {
  const [rate, setRate] = useState<number>(5);
  const [unit, setUnit] = useState<string>('hour');

  const handleConfirm = () => {
    if (rate > 0) {
      onConfirm(rate, unit);
    }
  };

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
            <PauseCircle className="h-5 w-5 text-primary" />
            Hold & Apply Parking Fee
          </DialogTitle>

          <p className="text-sm text-muted-foreground">
            Set the parking fee rate for this hold period.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Fee Rate">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={rate}
              onChange={(e) =>
                setRate(parseFloat(e.target.value) || 0)
              }
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <Field label="Unit">
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger
                className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
              >
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>

              <SelectContent className="rounded-lg">
                <SelectItem value="minute">
                  Per Minute
                </SelectItem>
                <SelectItem value="hour">Per Hour</SelectItem>
                <SelectItem value="day">Per Day</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              The fee will be calculated based on the elapsed time from now until the hold is removed.
            </p>
          </Field>
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
            onClick={handleConfirm}
            disabled={loading || rate <= 0}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            {loading ? 'Holding...' : 'Confirm Hold'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}