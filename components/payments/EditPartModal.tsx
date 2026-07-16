// components/payments/EditPartModal.tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: any;
  form: { quantity: number; priceAtTime: number };
  setForm: (form: { quantity: number; priceAtTime: number }) => void;
  onSave: () => void;
  saving: boolean;
}

export default function EditPartModal({ open, onOpenChange, part, form, setForm, onSave, saving }: EditPartModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-black">Edit Part</DialogTitle>
          <DialogDescription>Change the quantity or unit price.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Part Name</Label>
            <p className="text-sm font-medium">{part?.partName || 'Part'}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantity</Label>
            <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price per unit (₱)</Label>
            <Input type="number" step="0.01" value={form.priceAtTime} onChange={(e) => setForm({ ...form, priceAtTime: parseFloat(e.target.value) || 0 })} className="rounded-xl" />
          </div>
          <div className="text-sm text-muted-foreground">Total: ₱{(form.quantity * form.priceAtTime).toFixed(2)}</div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}