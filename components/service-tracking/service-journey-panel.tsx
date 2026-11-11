'use client';
import React,{useCallback,useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {AlertTriangle,Clock3,RefreshCw,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
interface Props{appointmentId:string;allowDelayEdit?:boolean}
export default function ServiceJourneyPanel({appointmentId,allowDelayEdit=true}:Props){
 const [data,setData]=useState<any>(null);const [reason,setReason]=useState('');const [eta,setEta]=useState('');const [saving,setSaving]=useState(false);
 const refresh=useCallback(async()=>{if(!appointmentId)return;try{const res=await fetch(`/api/service-journey/${appointmentId}`,{cache:'no-store'});const json=await res.json();if(!json.error)setData(json.data);}catch(error){console.error('[ServiceJourneyPanel]',error);}},[appointmentId]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);return()=>clearInterval(timer);},[refresh]);
 const save=async(resolve=false)=>{setSaving(true);try{const res=await fetch(`/api/service-journey/${appointmentId}/delay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason,expectedReadyAt:eta?new Date(eta).toISOString():null,resolve})});const json=await res.json();if(!res.ok||json.error)throw new Error(json.errorMessage||'Unable to record delay.');toast.success(json.message);setReason('');setEta('');await refresh();}catch(e:any){toast.error(e.message);}finally{setSaving(false);}};
 if(!appointmentId)return null;
 return <section className="rounded-xl border border-border bg-card p-4 my-4 space-y-3"><div className="flex justify-between items-center gap-3"><h3 className="font-semibold text-base">Live Service Journey</h3><Button type="button" size="sm" variant="ghost" onClick={()=>void refresh()}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button></div>
 {data?<><p className="text-sm text-muted-foreground">{data.customerMessage}</p><div className="flex flex-wrap gap-2">{data.phases?.map((p:any)=><span key={p.key} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.state==='CURRENT'?'bg-primary text-primary-foreground':p.state==='DONE'?'bg-green-100 text-green-800':'bg-muted text-muted-foreground'}`}>{p.label}</span>)}</div><p className="text-xs text-muted-foreground">Inspection {data.inspection?.done}/{data.inspection?.total} · Repair {data.work?.done}/{data.work?.total} · Progress {data.progressPercent}%</p>
 {data.delay?<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"><p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>Reported delay</p><p className="text-sm mt-1">{data.delay.reason}</p>{data.delay.expectedReadyAt?<p className="text-xs">Expected ready: {new Date(data.delay.expectedReadyAt).toLocaleString('en-PH')}</p>:null}{allowDelayEdit?<Button size="sm" variant="outline" disabled={saving} onClick={()=>void save(true)} className="mt-2">Resolve delay</Button>:null}</div>:null}
 {data.warranty?<div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900"><ShieldCheck className="inline h-4 w-4 mr-2"/>Warranty: {data.warranty.coverage}, until {new Date(data.warranty.expiresAt).toLocaleDateString('en-PH')}</div>:null}
 {allowDelayEdit && ['UNDER_INSPECTION','WAITING_FOR_APPROVAL','IN_PROGRESS'].includes(data.status)?<div className="border-t pt-3 space-y-2"><p className="text-sm font-semibold">Report delay to customer (SMS + push)</p><Textarea aria-label="Delay reason" placeholder="Describe the reason for delay" value={reason} maxLength={600} onChange={e=>setReason(e.target.value)}/><label className="block text-xs text-muted-foreground">New expected completion (optional)</label><Input aria-label="Expected completion" type="datetime-local" value={eta} onChange={e=>setEta(e.target.value)}/><Button type="button" disabled={saving||reason.trim().length<4} onClick={()=>void save()}>{saving?'Saving...':'Report Delay'}</Button></div>:null}
 </>:<p className="text-xs text-muted-foreground">Loading progress…</p>}</section>;
}
