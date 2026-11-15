'use client';
import React, {useCallback,useEffect,useState} from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { ShieldCheck, Trash2 } from 'lucide-react';
import WarrantyDisplay, {type WarrantyItem} from './WarrantyDisplay';

type InventoryItem={id:string;name:string;active:boolean};
const today=()=>new Date().toISOString().slice(0,10);
const nextYear=()=>{const d=new Date();d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10)};
const emptyForm=()=>({title:'',coverageType:'SERVICE',provider:'AutoCare',startDate:today(),endDate:nextYear(),coverage:'',terms:'',exclusions:'',claimInstructions:'Contact AutoCare with the receipt and service reference.',contact:'',inventoryIds:[] as string[]});

/** Staff-only warranty editor. Only PENDING/WAITING_FOR_APPROVAL estimates accept changes. */
export default function WarrantyManager({estimateId,estimateStatus,compact=false}:{estimateId:string;estimateStatus:string;compact?:boolean}){
 const [open,setOpen]=useState(false),[form,setForm]=useState(emptyForm),[inventory,setInventory]=useState<InventoryItem[]>([]);
 const [search,setSearch]=useState(''),[items,setItems]=useState<WarrantyItem[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const editable=['PENDING','WAITING_FOR_APPROVAL'].includes(estimateStatus);
 const load=useCallback(async()=>{try{const r=await fetch(`/api/payments/estimates/${encodeURIComponent(estimateId)}/warranties`,{cache:'no-store'});const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Could not load warranties');setItems(Array.isArray(b.data)?b.data:[])}catch(e){setError(e instanceof Error?e.message:'Failed to load warranties')}},[estimateId]);
 useEffect(()=>{if(open)void load()},[open,load]);
 useEffect(()=>{if(!open)return;let live=true;const h=setTimeout(()=>{fetch(`/api/inventory?limit=100&search=${encodeURIComponent(search)}`,{cache:'no-store'})
 .then(r=>r.json()).then(b=>{if(live){const raw=Array.isArray(b.data)?b.data:Array.isArray(b.data?.items)?b.data.items:[];setInventory(raw.filter((i:InventoryItem)=>i.active!==false))}}).catch(()=>{});},250);return()=>{live=false;clearTimeout(h)}},[open,search]);
 const save=async()=>{setError('');setBusy(true);try{
 const r=await fetch(`/api/payments/estimates/${encodeURIComponent(estimateId)}/warranties`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
 const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Could not save warranty');setForm(emptyForm());await load();window.dispatchEvent(new CustomEvent('autocare:warranty-change',{detail:{estimateId}}));
 }catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}};
 const remove=async(id:string)=>{if(!window.confirm('Remove this warranty from the estimate and linked parts?'))return;setBusy(true);setError('');try{const r=await fetch(`/api/payments/estimates/${estimateId}/warranties/${id}`,{method:'DELETE'});const b=await r.json();if(!r.ok||b.error)throw Error(b.errorMessage||'Delete failed');await load();window.dispatchEvent(new CustomEvent('autocare:warranty-change',{detail:{estimateId}}));}catch(e){setError(e instanceof Error?e.message:'Delete failed')}finally{setBusy(false)}};
 const field=(name:keyof ReturnType<typeof emptyForm>,label:string,required=false,multiline=false)=> <label className="flex flex-col gap-1 text-sm" key={name}><span className="font-medium">{label}{required?' *':''}</span>{multiline?<textarea rows={2} className="w-full rounded-md border border-border bg-background p-2" value={form[name] as string} onChange={e=>setForm(v=>({...v,[name]:e.target.value}))}/>:<input type={name==='startDate'||name==='endDate'?'date':'text'} maxLength={name==='title'||name==='provider'?160:name==='contact'?255:undefined} className="w-full rounded-md border border-border bg-background p-2" value={form[name] as string} onChange={e=>setForm(v=>({...v,[name]:e.target.value}))}/>}</label>;
 return <><Button type="button" size={compact?'sm':'default'} variant="outline" onClick={()=>setOpen(true)}><ShieldCheck className="mr-1.5 h-4 w-4"/>{editable?'Add Warranty':'View Warranty'}</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-y-auto">
   <DialogHeader><DialogTitle>Service Warranty — Estimate</DialogTitle></DialogHeader>
   <p className="text-xs text-muted-foreground">Warranties cover the exact dates and parts specified here. They do not change prices. Details are locked after estimate approval or decline.</p>
   {error&&<div role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
   {editable&&<div className="space-y-3 border-b pb-5">
    {field('title','Warranty title',true)}
    <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Coverage type *</span><select className="rounded border bg-background p-2" value={form.coverageType} onChange={e=>setForm(v=>({...v,coverageType:e.target.value}))}><option value="SERVICE">Service / labor</option><option value="PARTS">Parts</option><option value="BOTH">Parts and service</option></select></label>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{field('provider','Warranty provider',true)}{field('contact','Contact / claim email or phone')}</div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{field('startDate','Start date',true)}{field('endDate','End date',true)}</div>
    {field('coverage','Covered services / parts / defects',true,true)}
    {field('terms','Warranty terms and conditions',true,true)}
    {field('exclusions','Exclusions',false,true)}
    {field('claimInstructions','How the customer claims warranty',true,true)}
    <div className="space-y-2 rounded-md border p-3"><label className="block text-sm font-semibold">Attach inventory parts (required for Parts/Both)</label>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory parts" className="w-full rounded border bg-background p-2 text-sm"/>
      <div className="max-h-36 space-y-1 overflow-y-auto">{inventory.map(item=><label key={item.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm"><input type="checkbox" checked={form.inventoryIds.includes(item.id)} onChange={e=>setForm(v=>({...v,inventoryIds:e.target.checked?[...v.inventoryIds,item.id]:v.inventoryIds.filter(id=>id!==item.id)}))}/>{item.name}</label>)}</div>
      <p className="text-xs text-muted-foreground">Selected: {form.inventoryIds.length} item(s). Use search to find parts not listed. Linked parts are stored by inventory ID with a name snapshot.</p>
    </div>
    <Button type="button" disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save Warranty'}</Button>
   </div>}
   <h3 className="text-sm font-semibold">Attached warranties ({items.length})</h3>
   <WarrantyDisplay warranties={items}/>
   {editable&&items.map(item=><Button key={item.id} type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void remove(item.id)}><Trash2 className="mr-2 h-3.5 w-3.5"/>Remove {item.title}</Button>)}
  </DialogContent></Dialog>
 </>;
}
