'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save, X } from 'lucide-react';
import { inventoryApi } from '@/lib/inventory/inventory';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onSuccess: () => void;
}

export default function InventoryForm({ open, onOpenChange, item, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '', description: '', quantity: 0, unit: '',
    costPrice: 0, sellingPrice: 0, reorderLevel: 0,
    lowStockAlert: true, active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || '',
        costPrice: parseFloat(item.costPrice) || 0,
        sellingPrice: parseFloat(item.sellingPrice) || 0,
        reorderLevel: item.reorderLevel || 0,
        lowStockAlert: item.lowStockAlert ?? true,
        active: item.active ?? true,
      });
    } else {
      setForm({ name: '', description: '', quantity: 0, unit: '', costPrice: 0, sellingPrice: 0, reorderLevel: 0, lowStockAlert: true, active: true });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form };
    const res = item ? await inventoryApi.update(item.id, payload) : await inventoryApi.create(payload);
    if (res.error) toast.error(res.errorMessage || 'Error');
    else {
      toast.success(item ? 'Item updated' : 'Item created');
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-black">{item ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Unit *</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Cost Price (₱)</Label>
              <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Selling Price (₱)</Label>
              <Input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Reorder Level</Label>
            <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value })} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.lowStockAlert} onCheckedChange={(c) => setForm({ ...form, lowStockAlert: !!c })} />
              Low stock alert
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: !!c })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" /> {item ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}