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
import { PlusCircle } from 'lucide-react';

interface FeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    title: string;
    amount: string;
    findingId: string;
  };
  setForm: (form: {
    title: string;
    amount: string;
    findingId: string;
  }) => void;
  onSave: () => void;
  saving: boolean;
  findings?: any[];
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function FeeModal({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
  findings = [],
}: FeeModalProps) {
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
            <PlusCircle className="h-5 w-5 text-primary" />
            Add Fee
          </DialogTitle>

          <DialogDescription className="text-sm">
            Add a service fee or labor charge.
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
              placeholder="e.g., Labor - Engine Work"
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <Field label="Amount (₱)">
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              placeholder="0.00"
              className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
            />
          </Field>

          <Field label="Finding (Optional)">
            <Select
              value={form.findingId}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  findingId: v,
                })
              }
            >
              <SelectTrigger
                className={`h-11 rounded-md text-base md:h-9 md:text-sm ${focusClass}`}
              >
                <SelectValue placeholder="Select finding (optional)" />
              </SelectTrigger>

              <SelectContent className="rounded-lg">
                <SelectItem value="none">None</SelectItem>

                {findings.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {saving ? 'Adding...' : 'Add Fee'}
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