'use client';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package, Search } from 'lucide-react';
import { defaultFindingsApi } from '@/lib/service-tracking/default-findings';
import { toast } from 'sonner';

export interface DefaultFindingSelection { description: string; parts: Array<{ inventoryItemId?: string | null; partName: string; quantity: number; priceAtTime: number; isPms: boolean; }>; }
interface Props { open:boolean; onOpenChange:(open:boolean)=>void; onAddFindings:(findings:DefaultFindingSelection[])=>Promise<void>; isAdding:boolean; }
export default function DefaultFindingPickerModal({open,onOpenChange,onAddFindings,isAdding}:Props){
 const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(false); const [search,setSearch]=useState(''); const [selected,setSelected]=useState<Set<string>>(new Set());
 useEffect(()=>{ if(!open){setSelected(new Set());setSearch('');return;} (async()=>{setLoading(true);try{const r=await defaultFindingsApi.list();if(r?.error)throw new Error(r.errorMessage||'Failed to load default findings.');setItems(Array.isArray(r?.data)?r.data:[]);}catch(e:any){toast.error(e?.message||'Failed to load default findings.');setItems([]);}finally{setLoading(false);}})();},[open]);
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return !q?items:items.filter(f=>[f?.title,...(f?.parts||[]).map((p:any)=>p?.partName)].filter(Boolean).join(' ').toLowerCase().includes(q));},[items,search]);
 const toggle=(id:string)=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
 const add=async()=>{const chosen=items.filter(i=>selected.has(i.id)).map(f=>({description:String(f.title||''),parts:(f.parts||[]).map((p:any)=>({inventoryItemId:p.inventoryItemId||null,partName:String(p.partName||''),quantity:Math.max(1,Number(p.quantity)||1),priceAtTime:Boolean(p.isPms)?0:Math.max(0,Number(p.priceAtTime)||0),isPms:Boolean(p.isPms)}))}));if(!chosen.length)return;await onAddFindings(chosen);};
 return <Dialog open={open} onOpenChange={(v)=>!isAdding&&onOpenChange(v)}><DialogContent className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden"><DialogHeader><DialogTitle>Add Default Findings</DialogTitle></DialogHeader><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" placeholder="Search default findings"/></div><ScrollArea className="min-h-0 flex-1 pr-3">{loading?<div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin"/></div>:visible.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No default findings found.</div>:<div className="space-y-2 py-2">{visible.map(f=><button type="button" key={f.id} onClick={()=>toggle(f.id)} className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/40"><Checkbox checked={selected.has(f.id)} onCheckedChange={()=>toggle(f.id)} onClick={e=>e.stopPropagation()}/><div className="min-w-0 flex-1"><p className="font-medium">{f.title}</p>{(f.parts||[]).length>0&&<div className="mt-2 space-y-1">{f.parts.map((p:any)=><p key={p.id} className="flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3"/>{p.partName} × {p.quantity}{p.inventoryItemId?' · inventory linked':''}</p>)}</div>}</div></button>)}</div>}</ScrollArea><DialogFooter><Button variant="outline" disabled={isAdding} onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={selected.size===0||isAdding} onClick={()=>void add()}>{isAdding?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</>:`Add ${selected.size || ''} Finding${selected.size===1?'':'s'}`}</Button></DialogFooter></DialogContent></Dialog>;
}
