'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Estimate } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { CheckCircle2, ChevronDown, ChevronUp, CircleParking, Clock3, DollarSign, Eye, Send, XCircle } from 'lucide-react';
import { paymentsConfigurationApi } from '@/lib/payments/configuration';
import ShareDocumentButton from './ShareDocumentButton';
import ParkVehicleConfirmationModal from './ParkVehicleConfirmationModal';
import StopParkingConfirmationModal from './StopParkingConfirmationModal';

interface EstimatesListProps {
  estimates: Estimate[];
  statusFilter: string;
  onRequestSendForApproval: (estimate: Estimate) => void;
  onRequestApprove: (estimate: Estimate) => void;
  onRequestDecline: (estimate: Estimate) => void;
  onOpenDetail: (item: Estimate, type: 'estimate') => void;
  onUpdated?: () => Promise<void> | void;
}
const badge = (s: string) => ({PENDING:'border-rose-200 bg-rose-50 text-rose-700',PARKED:'border-amber-200 bg-amber-50 text-amber-700',WAITING_FOR_APPROVAL:'border-blue-200 bg-blue-50 text-blue-700',APPROVED:'border-emerald-200 bg-emerald-50 text-emerald-700',DECLINED:'border-zinc-200 bg-zinc-50 text-zinc-700'} as Record<string,string>)[s] || 'border-border bg-muted text-muted-foreground';
const customer = (e:any) => e?.appointment?.customer?.fullname || e?.customer?.fullname || 'Customer';
const dateText = (v: unknown) => {const d=new Date(String(v ?? ''));return Number.isNaN(d.getTime())?'—':format(d,'MMM dd, yyyy');};
const money = (v:unknown) => '₱'+formatCurrency(Number(v||0));
const daysSince=(v:unknown)=> Math.max(1, Math.ceil(Math.max(0,Date.now()-new Date(String(v)).getTime())/86400000)||1);

export default function EstimatesList({estimates,statusFilter,onRequestSendForApproval,onRequestApprove,onRequestDecline,onOpenDetail,onUpdated}:EstimatesListProps) {
 const [approvedExpanded,setApprovedExpanded]=useState(false);
 const [parkingEstimate,setParkingEstimate]=useState<Estimate|null>(null);
 const [stopEstimate,setStopEstimate]=useState<Estimate|null>(null);
 const [rate,setRate]=useState(0);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(statusFilter==='APPROVED')setApprovedExpanded(true)},[statusFilter]);
 const {active,approved}=useMemo(()=>({active:estimates.filter(e=>e.status!=='APPROVED'),approved:estimates.filter(e=>e.status==='APPROVED')}),[estimates]);
 const loadRate=useCallback(async()=>{try{const r=await paymentsConfigurationApi.get();if(r.error)throw Error(r.errorMessage||'Unable to load parking rate');setRate(Math.max(0,Number(r.data?.parkingFeePerDay)||0));}catch(e){toast.error(e instanceof Error?e.message:'Unable to load parking configuration');}},[]);
 const changeParking=async(e:Estimate,park:boolean,addParkingFee=false)=>{
  setBusy(true);
  try {
   const res=await fetch(`/api/payments/estimates/${encodeURIComponent(e.id)}/parking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({park,addParkingFee})});
   const result=await res.json(); if(!res.ok||result.error)throw Error(result.errorMessage||'Unable to update parking.');
   toast.success(result.message||'Estimate parking updated.');setParkingEstimate(null);setStopEstimate(null);await onUpdated?.();
  } catch (error){toast.error(error instanceof Error?error.message:'Parking failed.');}finally{setBusy(false);}
 };
 const actions=(e:Estimate)=>{
  if(e.status==='PENDING')return <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>{setParkingEstimate(e);void loadRate()}}><CircleParking className="mr-1 h-4 w-4"/>Park</Button><Button type="button" size="sm" disabled={busy} onClick={()=>onRequestSendForApproval(e)}><Send className="mr-1 h-4 w-4"/>Send for approval</Button></div>;
  if(e.status==='PARKED')return <Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>setStopEstimate(e)}><CircleParking className="mr-1 h-4 w-4"/>Stop Parking</Button>;
  if(e.status==='WAITING_FOR_APPROVAL')return <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={()=>onRequestApprove(e)}><CheckCircle2 className="mr-1 h-4 w-4"/>Approve</Button><Button type="button" size="sm" variant="outline" onClick={()=>onRequestDecline(e)}><XCircle className="mr-1 h-4 w-4"/>Decline</Button></div>;
  return null;
 };
 const parking=(e:Estimate)=>e.status==='PARKED'?<span className="flex items-center gap-1 text-xs text-amber-700"><Clock3 className="h-4 w-4"/>{daysSince(e.parkedAt)} day(s) · {money(daysSince(e.parkedAt)*(e.parkingFeeEnabled?Number(e.parkingFeeRate||0):0))}</span>:<span className="text-muted-foreground">—</span>;
 const rows=(items:Estimate[])=><>
  <div className="grid grid-cols-1 gap-3 md:hidden">{items.map(e=><Card key={e.id} className="border-border bg-card shadow-sm"><CardContent className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{customer(e)}</p><p className="text-xs text-muted-foreground">{e.appointment?.trackingNumber||e.id.slice(0,8).toUpperCase()}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge(e.status)}`}>{e.status.replace(/_/g,' ')}</span></div><div className="flex justify-between rounded-xl bg-muted/30 p-3"><div><p className="text-xs text-muted-foreground">Created</p>{dateText(e.createdAt)}</div><div className="text-right"><p className="text-xs text-muted-foreground">Estimate</p><p className="text-xl font-bold text-primary">{money(e.grandTotal)}</p></div></div>{parking(e)}<div className="flex flex-wrap items-center gap-2">{actions(e)}<ShareDocumentButton kind="estimate" documentId={e.id} compact/><Button type="button" size="sm" variant="outline" onClick={()=>onOpenDetail(e,'estimate')}><Eye className="mr-1 h-4 w-4"/>Details</Button></div></CardContent></Card>)}</div>
  <Card className="hidden overflow-hidden rounded-xl border border-border shadow-sm md:block"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Estimate</TableHead><TableHead>Created</TableHead><TableHead>Customer / Tracking</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Parking</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{items.map(e=><TableRow key={e.id} className={e.status==='PENDING'?'bg-rose-50/40':''}><TableCell className="font-mono text-xs font-medium">{e.id.slice(0,8).toUpperCase()}</TableCell><TableCell className="text-xs text-muted-foreground">{dateText(e.createdAt)}</TableCell><TableCell><p className="font-medium">{customer(e)}</p><p className="text-xs text-muted-foreground">{e.appointment?.trackingNumber||'No tracking number'}</p></TableCell><TableCell><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badge(e.status)}`}>{e.status.replace(/_/g,' ')}</span></TableCell><TableCell className="text-right font-semibold">{money(e.grandTotal)}</TableCell><TableCell>{parking(e)}</TableCell><TableCell><div className="flex justify-end gap-2">{actions(e)}<ShareDocumentButton kind="estimate" documentId={e.id} compact/><Button type="button" size="sm" variant="outline" onClick={()=>onOpenDetail(e,'estimate')}><Eye className="mr-1 h-4 w-4"/>Details</Button></div></TableCell></TableRow>)}</TableBody></Table></div></Card>
 </>;
 const stopDays=stopEstimate?daysSince(stopEstimate.parkedAt):1;
 const stopRate=stopEstimate?.parkingFeeEnabled?Number(stopEstimate.parkingFeeRate||0):0;
 return <div className="space-y-4">
  {!active.length&&!approved.length?<EmptyState icon={DollarSign} title="No Estimates" description="Estimates appear here before Final Costs are generated."/>:null}
  {active.length?<section className="space-y-2"><h3 className="text-sm font-semibold">Estimates ({active.length})</h3>{rows(active)}</section>:null}
  {approved.length?<section className="space-y-2"><Button type="button" className="w-full justify-between" variant="outline" onClick={()=>setApprovedExpanded(v=>!v)} aria-expanded={approvedExpanded}><span>Approved Estimates ({approved.length})</span>{approvedExpanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</Button>{approvedExpanded?rows(approved):null}</section>:null}
  <ParkVehicleConfirmationModal open={Boolean(parkingEstimate)} onOpenChange={v=>{if(!v)setParkingEstimate(null)}} parkingFeePerDay={rate} loading={busy} onConfirm={enabled=>parkingEstimate?changeParking(parkingEstimate,true,enabled):undefined}/>
  <StopParkingConfirmationModal open={Boolean(stopEstimate)} onOpenChange={v=>{if(!v)setStopEstimate(null)}} parkingFee={stopDays*stopRate} billableDays={stopDays} rate={stopRate} parkedAt={stopEstimate?.parkedAt||null} loading={busy} onConfirm={()=>stopEstimate?changeParking(stopEstimate,false):undefined}/>
 </div>;
}
