// components/payments/TransactionModal.tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: any;
  setEditing: (val: any) => void;
  onSave: (form: any) => void;
  saving: boolean;
}

export default function TransactionModal({ open, onOpenChange, editing, onSave, saving }: TransactionModalProps) {
  const [form, setForm] = useState({
    appointmentId: '',
    invoiceType: 'ESTIMATE',
    status: 'PENDING',
    totalAmount: '',
    details: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{editing ? 'Edit Invoice' : 'New Transaction'}</DialogTitle>
          <DialogDescription>Create a new invoice or estimate.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appointment</Label>
            <Select value={form.appointmentId} onValueChange={(v) => setForm({ ...form, appointmentId: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select appointment..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="appt1">Appointment #1 - John Doe</SelectItem>
                <SelectItem value="appt2">Appointment #2 - Jane Smith</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={form.invoiceType} onValueChange={(v) => setForm({ ...form, invoiceType: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESTIMATE">Estimate</SelectItem>
                  <SelectItem value="FINAL">Final Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="WAITING_FOR_APPROVAL">Waiting Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₱)</Label>
            <Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} className="rounded-xl h-12 text-lg font-black" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Details / Notes</Label>
            <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="rounded-xl resize-none" rows={3} placeholder="Service details..." />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
              {saving ? 'Saving...' : 'Save Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}