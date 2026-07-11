import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { inventoryApi } from '@/lib/inventory/inventory';

export default function RestockModal({ item, onClose, onSuccess }: { item: any; onClose: () => void; onSuccess: () => void }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  if (!item) return null;

  const handleRestock = async () => {
    setLoading(true);
    const res = await inventoryApi.restock(item.id, qty);
    if (res.error) toast.error(res.errorMessage || 'Restock failed');
    else {
      toast.success(`${qty} added to ${item.name}`);
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-black">Restock: {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Add Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRestock} disabled={loading}>{loading ? '...' : 'Confirm Restock'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}