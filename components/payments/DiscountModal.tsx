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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent } from 'lucide-react';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    title: string;
    type: string;
    value: string;
  };
  setForm: (form: {
    title: string;
    type: string;
    value: string;
  }) => void;
  onSave: () => void;
  saving: boolean;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function DiscountModal({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
}: DiscountModalProps) {
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
            <Percent className="h-5 w-5 text-primary" />
            Add Discount
          </DialogTitle>

          <DialogDescription className="text-sm">
            Apply a discount to the estimate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              placeholder="e.g., Loyalty Discount"
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <Field label="Type">
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  type: v,
                })
              }
            >
              <SelectTrigger
                className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="rounded-lg">
                <SelectItem value="fixed">Fixed (₱)</SelectItem>
                <SelectItem value="percentage">
                  Percentage (%)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Value">
            <Input
              type="number"
              step="0.01"
              value={form.value}
              onChange={(e) =>
                setForm({
                  ...form,
                  value: e.target.value,
                })
              }
              placeholder={form.type === 'fixed' ? '0.00' : '0'}
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />

            <p className="text-xs text-muted-foreground">
              {form.type === 'fixed'
                ? 'Enter a fixed amount in ₱.'
                : 'Enter a percentage (e.g., 10 for 10%).'}
            </p>
          </Field>
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
            {saving ? 'Adding...' : 'Add Discount'}
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