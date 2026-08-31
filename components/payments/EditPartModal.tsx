import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';

interface EditPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: any;
  form: {
    quantity: number;
    priceAtTime: number;
  };
  setForm: (form: {
    quantity: number;
    priceAtTime: number;
  }) => void;
  onSave: () => void;
  saving: boolean;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function EditPartModal({
  open,
  onOpenChange,
  part,
  form,
  setForm,
  onSave,
  saving,
}: EditPartModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100%-1rem)] rounded-xl border border-border
          bg-card shadow-2xl sm:max-w-sm
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Part
          </DialogTitle>

          <DialogDescription>
            Change the quantity or unit price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Part Name
            </Label>

            <p className="mt-1 text-sm font-medium">
              {part?.partName || 'Part'}
            </p>
          </div>

          <Field label="Quantity">
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: parseInt(e.target.value) || 1,
                })
              }
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <Field label="Price per unit (₱)">
            <Input
              type="number"
              step="0.01"
              value={form.priceAtTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  priceAtTime:
                    parseFloat(e.target.value) || 0,
                })
              }
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border bg-primary/[0.04] p-3">
            <span className="text-sm text-muted-foreground">
              Total
            </span>

            <span className="font-semibold text-primary">
              ₱{(form.quantity * form.priceAtTime).toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={`h-11 w-full rounded-md md:h-9 md:w-auto ${focusClass}`}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={`h-11 w-full rounded-md px-5 md:h-9 md:w-auto ${focusClass}`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
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