'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Plus, Search, Trash2, Edit2, X } from 'lucide-react';
import InventoryPicker from '@/components/inventory/inventory-picker';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void; }
interface PartForm { id?: string; inventoryItemId?: string | null; partName: string; quantity: number; priceAtTime: number; isPms: boolean; }
interface FindingForm { title: string; parts: PartForm[]; }
const emptyForm = (): FindingForm => ({ title: '', parts: [] });

export default function DefaultFindingManagerModal({ open, onOpenChange, onSaved }: Props) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FindingForm>(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const res = await defaultFindingsApi.list();
      if (res?.error) throw new Error(res.errorMessage || 'Failed to load default findings.');
      setFindings(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) { toast.error(e?.message || 'Failed to load default findings.'); setFindings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return findings;
    return findings.filter((f) => [f?.title, ...(f?.parts || []).map((p: any) => p?.partName)].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [findings, search]);

  const reset = () => { setEditingId(null); setForm(emptyForm()); };
  const edit = (f: any) => {
    setEditingId(f.id);
    setForm({
      title: String(f?.title || ''),
      parts: (Array.isArray(f?.parts) ? f.parts : []).map((p: any) => ({
        id: p.id,
        inventoryItemId: p.inventoryItemId || null,
        partName: String(p?.partName || ''), quantity: Math.max(1, Number(p?.quantity) || 1),
        priceAtTime: Math.max(0, Number(p?.priceAtTime) || 0), isPms: Boolean(p?.isPms),
      })),
    });
  };
  const addPart = () => setForm((v) => ({ ...v, parts: [...v.parts, { id: `new-${Date.now()}`, inventoryItemId: null, partName: '', quantity: 1, priceAtTime: 0, isPms: false }] }));
  const changePart = (i: number, patch: Partial<PartForm>) => setForm((v) => ({ ...v, parts: v.parts.map((p, n) => n === i ? { ...p, ...patch } : p) }));
  const removePart = (i: number) => setForm((v) => ({ ...v, parts: v.parts.filter((_, n) => n !== i) }));

  const save = async () => {
    const title = form.title.trim();
    if (!title) return toast.error('Finding title is required.');
    const parts = form.parts.map((p) => ({
      inventoryItemId: p.inventoryItemId || null,
      partName: p.partName.trim(), quantity: Math.max(1, Number(p.quantity) || 1),
      priceAtTime: p.isPms ? 0 : Math.max(0, Number(p.priceAtTime) || 0), isPms: Boolean(p.isPms),
    })).filter((p) => p.partName);
    setSaving(true);
    try {
      const res = editingId
        ? await defaultFindingsApi.update(editingId, { title, parts })
        : await defaultFindingsApi.create({ title, parts });
      if (res?.error) throw new Error(res.errorMessage || 'Could not save default finding.');
      toast.success(editingId ? 'Default finding updated.' : 'Default finding added.');
      reset();
      onSaved();
      // Saving is complete before the dialog closes, so the user gets a clear
      // loading state and is returned to Service Tracking immediately.
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message || 'Could not save default finding.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this default finding? This does not remove findings already copied to appointments.')) return;
    setDeletingId(id);
    try {
      const res = await defaultFindingsApi.delete(id);
      if (res?.error) throw new Error(res.errorMessage || 'Could not delete default finding.');
      toast.success('Default finding deleted.'); if (editingId === id) reset(); await load(); onSaved();
    } catch (e: any) { toast.error(e?.message || 'Could not delete default finding.'); }
    finally { setDeletingId(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl flex-col overflow-hidden rounded-xl p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle>Default Finding Library</DialogTitle>
          <DialogDescription>Create reusable findings and optionally attach the inventory item each part represents. Default findings no longer use Active/Inactive status.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
            <div className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search findings or parts" className="pl-9"/></div></div>
            <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
              {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin"/></div> : visible.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No default findings found.</div> : <div className="space-y-2">
                {visible.map((f) => <div key={f.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{f.title}</p><p className="mt-1 text-xs text-muted-foreground">{(f.parts || []).length} attached part(s)</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={()=>edit(f)} aria-label="Edit"><Edit2 className="h-4 w-4"/></Button><Button variant="ghost" size="icon" disabled={deletingId===f.id} onClick={()=>void remove(f.id)} aria-label="Delete">{deletingId===f.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Trash2 className="h-4 w-4"/>}</Button></div></div></div>)}
              </div>}
            </ScrollArea>
          </div>
          <div className="flex min-h-0 flex-col">
            <ScrollArea className="min-h-0 flex-1 p-5">
              <div className="space-y-5 pr-3">
                <div><Label>Finding title</Label><Input className="mt-2" value={form.title} onChange={(e)=>setForm((v)=>({...v,title:e.target.value}))} placeholder="e.g. Worn front brake pads"/></div>
                <div className="flex items-center justify-between"><div><Label>Attached parts</Label><p className="text-xs text-muted-foreground">Pick inventory to keep the stock reference when this default is used.</p></div><Button type="button" variant="outline" onClick={addPart}><Plus className="mr-2 h-4 w-4"/>Part</Button></div>
                <div className="space-y-3">{form.parts.map((part,i)=><div key={part.id || i} className="rounded-lg border p-3"><div className="grid gap-3 md:grid-cols-[1fr_110px_140px_auto]">
                  <div><Label>Part</Label><div className="mt-2 flex gap-2"><Input value={part.partName} onChange={(e)=>changePart(i,{partName:e.target.value,inventoryItemId:null})} placeholder="Part name"/><InventoryPicker onSelect={(item)=>changePart(i,{inventoryItemId:item.id,partName:item.name,priceAtTime:item.price})}><Button type="button" variant="outline" size="icon" title="Pick from inventory"><Package className="h-4 w-4"/></Button></InventoryPicker></div>{part.inventoryItemId && <p className="mt-1 text-[11px] text-muted-foreground">Linked to inventory</p>}</div>
                  <div><Label>Qty</Label><Input className="mt-2" type="number" min={1} value={part.quantity} onChange={(e)=>changePart(i,{quantity:Number(e.target.value)})}/></div>
                  <div><Label>Price</Label><Input className="mt-2" type="number" min={0} step="0.01" disabled={part.isPms} value={part.isPms?0:part.priceAtTime} onChange={(e)=>changePart(i,{priceAtTime:Number(e.target.value)})}/></div>
                  <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={()=>removePart(i)}><X className="h-4 w-4"/></Button>
                </div><label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={part.isPms} onCheckedChange={(v)=>changePart(i,{isPms:v===true,priceAtTime:v===true?0:part.priceAtTime})}/>PMS / included at ₱0.00</label></div>)}</div>
              </div>
            </ScrollArea>
            <DialogFooter className="border-t p-4"><Button variant="outline" onClick={reset} disabled={saving}>Clear</Button><Button onClick={()=>void save()} disabled={saving}>{saving?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>:editingId?'Save Changes':'Add Default Finding'}</Button></DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
