'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { ShieldCheck, Trash2 } from 'lucide-react';
import WarrantyDisplay, { type WarrantyItem } from './WarrantyDisplay';

type InventoryItem = { id: string; name: string; active?: boolean; barcode?: string | null };
const today=()=>new Date().toISOString().slice(0,10);
const nextYear=()=>{const d=new Date();d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10)};
const empty=()=>({title:'',coverageType:'SERVICE',provider:'AutoCare',startDate:today(),endDate:nextYear(),coverage:'',terms:'',exclusions:'',claimInstructions:'Contact AutoCare with your receipt and service reference.',contact:'',inventoryIds:[] as string[]});

export default function WarrantyManager({estimateId,estimateStatus,compact=false,onChanged}:{estimateId:string;estimateStatus:string;compact?:boolean;onChanged?:()=>void}) {
 const [open,setOpen]=useState(false); const [form,setForm]=useState(empty);
 const [parts,setParts]=useState<InventoryItem[]>([]); const [selectedParts,setSelectedParts]=useState<Record<string,InventoryItem>>({});
 const [search,setSearch]=useState(''); const [items,setItems]=useState<WarrantyItem[]>([]);
 const [busy,setBusy]=useState(false); const [loadingParts,setLoadingParts]=useState(false); const [partsError,setPartsError]=useState(''); const [error,setError]=useState('');
 const editable=estimateStatus==='PENDING';
 const load=useCallback(async()=>{
  try{const r=await fetch(`/api/payments/estimates/${encodeURIComponent(estimateId)}/warranties`,{cache:'no-store'});const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Unable to load warranties');setItems(Array.isArray(b.data)?b.data:[]);}
  catch(e){setError(e instanceof Error?e.message:'Unable to load warranties');}
 },[estimateId]);
 useEffect(()=>{if(open)void load()},[open,load]);
 useEffect(()=>{
  if(!open||!editable)return;
  const controller=new AbortController();let active=true;
  setLoadingParts(true);setPartsError('');
  const timer=setTimeout(async()=>{
   try{
    const r=await fetch(`/api/inventory?page=1&limit=100&search=${encodeURIComponent(search.trim())}`,{cache:'no-store',signal:controller.signal});
    const body=await r.json();if(!r.ok||body.error)throw Error(body.errorMessage||'Inventory search unavailable');
    const entries=Array.isArray(body.data)?body.data:Array.isArray(body.data?.items)?body.data.items:[];
    if(active)setParts(entries.filter((item:InventoryItem)=>item.active!==false&&item.id&&item.name));
   }catch(e){if(active&&!controller.signal.aborted){setPartsError(e instanceof Error?e.message:'Unable to search inventory');setParts([])}}
   finally{if(active)setLoadingParts(false)}
  },250);
  return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[open,editable,search]);
 const select=(item:InventoryItem,checked:boolean)=>{
  setForm(v=>({...v,inventoryIds:checked?[...new Set([...v.inventoryIds,item.id])]:v.inventoryIds.filter(id=>id!==item.id)}));
  setSelectedParts(v=>checked?{...v,[item.id]:item}:Object.fromEntries(Object.entries(v).filter(([id])=>id!==item.id)));
 };
 const save=async()=>{
  setBusy(true);setError('');
  try{
   const r=await fetch(`/api/payments/estimates/${encodeURIComponent(estimateId)}/warranties`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Unable to save warranty');
   setForm(empty());setSelectedParts({});await load();onChanged?.();
  }catch(e){setError(e instanceof Error?e.message:'Unable to save warranty')}finally{setBusy(false)}
 };
 const remove=async(id:string)=>{
  if(!window.confirm('Remove this warranty and its linked parts?'))return;
  setBusy(true);setError('');try{
   const r=await fetch(`/api/payments/estimates/${encodeURIComponent(estimateId)}/warranties/${encodeURIComponent(id)}`,{method:'DELETE'});
   const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Unable to remove warranty');
   await load();onChanged?.();
  }catch(e){setError(e instanceof Error?e.message:'Unable to remove warranty')}finally{setBusy(false)}
 };
 const field=(name:keyof ReturnType<typeof empty>,label:string,required=false,multiline=false)=><label className="flex flex-col gap-1 text-sm" key={name}><span className="font-medium">{label}{required?' *':''}</span>{multiline?<textarea rows={2} className="w-full rounded-md border border-border bg-background p-2" value={form[name] as string} onChange={e=>setForm(v=>({...v,[name]:e.target.value}))}/>:<input type={name==='startDate'||name==='endDate'?'date':'text'} maxLength={name==='title'||name==='provider'?160:name==='contact'?255:undefined} className="w-full rounded-md border border-border bg-background p-2" value={form[name] as string} onChange={e=>setForm(v=>({...v,[name]:e.target.value}))}/>}</label>;
 return <><Button type="button" size={compact?'sm':'default'} variant="outline" onClick={()=>setOpen(true)}><ShieldCheck className="mr-1.5 h-4 w-4"/>{editable?'Add Warranty':'View Warranty'}</Button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-y-auto"><DialogHeader><DialogTitle>Service Warranty — Estimate</DialogTitle></DialogHeader>
  <p className="text-xs text-muted-foreground">Warranty terms and inventory links are saved against this Estimate. Once sent for approval, the Estimate becomes read-only.</p>
  {error?<p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>:null}
  {editable?<div className="space-y-3 border-b pb-5">
   {field('title','Warranty title',true)}
   <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Coverage type *</span><select className="rounded border bg-background p-2" value={form.coverageType} onChange={e=>setForm(v=>({...v,coverageType:e.target.value}))}><option value="SERVICE">Service / labor</option><option value="PARTS">Parts</option><option value="BOTH">Parts and service</option></select></label>
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{field('provider','Warranty provider',true)}{field('contact','Contact / claim phone or email')}</div>
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{field('startDate','Start date',true)}{field('endDate','End date',true)}</div>
   {field('coverage','Covered services, parts and defects',true,true)}{field('terms','Warranty terms',true,true)}{field('exclusions','Exclusions',false,true)}{field('claimInstructions','Claim instructions',true,true)}
   <div className="space-y-2 rounded-md border p-3"><label htmlFor="warranty-inventory-search" className="block text-sm font-semibold">Attach inventory parts (required for Parts / Both)</label>
    <input id="warranty-inventory-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by part name or barcode" className="w-full rounded border bg-background p-2 text-sm"/>
    {loadingParts?<p className="text-xs text-muted-foreground">Searching inventory...</p>:null}
    {partsError?<p role="alert" className="text-xs text-red-700">{partsError}</p>:null}
    <div className="max-h-44 space-y-1 overflow-y-auto">{parts.map(item=><label key={item.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"><input type="checkbox" checked={form.inventoryIds.includes(item.id)} onChange={e=>select(item,e.target.checked)}/><span>{item.name}{item.barcode?` (${item.barcode})`:''}</span></label>)}{!loadingParts&&!partsError&&!parts.length?<p className="text-xs text-muted-foreground">No matching inventory parts.</p>:null}</div>
    <p className="text-xs text-muted-foreground">Selected ({form.inventoryIds.length}): {form.inventoryIds.map(id=>selectedParts[id]?.name||'Part').join(', ')||'None'}</p>
   </div>
   <Button type="button" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save Warranty'}</Button>
  </div>:null}
  <h3 className="text-sm font-semibold">Attached warranties ({items.length})</h3><WarrantyDisplay warranties={items}/>
  {editable?items.map(item=><Button key={item.id} type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void remove(item.id)}><Trash2 className="mr-2 h-4 w-4"/>Remove {item.title}</Button>):null}
 </DialogContent></Dialog></>;
}
