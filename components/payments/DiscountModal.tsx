// components/payments/DiscountModal.tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { title: string; type: string; value: string };
  setForm: (form: { title: string; type: string; value: string }) => void;
  onSave: () => void;
  saving: boolean;
}

export default function DiscountModal({ open, onOpenChange, form, setForm, onSave, saving }: DiscountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black">Add Discount</DialogTitle>
          <DialogDescription>Apply a discount to the estimate.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Loyalty Discount" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed (₱)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value</Label>
            <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'fixed' ? '0.00' : '0'} className="rounded-xl" />
            <p className="text-[10px] text-muted-foreground">{form.type === 'fixed' ? 'Enter a fixed amount in ₱.' : 'Enter a percentage (e.g., 10 for 10%).'}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
            {saving ? 'Adding...' : 'Add Discount'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}