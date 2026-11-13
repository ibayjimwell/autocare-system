'use client';
import {useCallback,useEffect,useState} from 'react';
import {CheckCircle2,Copy,Download,CarFront,CalendarDays,WalletCards,RefreshCw,ShieldCheck,ClipboardList,AlertCircle} from 'lucide-react';
import type {SharedDocument} from '@/lib/document-share/document';

type Document=NonNullable<SharedDocument>;
const fmt=(n:number)=>`₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(v:string)=>{const parsed=new Date(v);return Number.isNaN(parsed.getTime())?v:parsed.toLocaleDateString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium'});};
const statusColor=(s:string)=>s==='PAID'||s==='APPROVED'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-amber-50 text-amber-800 border-amber-200';
const card='rounded-xl border border-[#e5e5ea] bg-white p-4 shadow-sm sm:p-6';

export default function SharedDocumentView({token,initial}:{token:string;initial:Document}) {
  const [doc,setDoc]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [copied,setCopied]=useState(false);
  const url=typeof window==='undefined'?'':window.location.href;
  const refresh=useCallback(async()=>{
    try {
      const res=await fetch(`/api/public/payment-documents/${token}`,{cache:'no-store'});
      const body=await res.json();
      if(res.ok&&!body.error&&body.data)setDoc(body.data);
    }catch{ /* Existing snapshot remains available; avoid false payment confirmation. */ }
  },[token]);
  useEffect(()=>{
    const onFocus=()=>{void refresh();};
    const timer=setInterval(onFocus,15000);
    window.addEventListener('focus',onFocus);
    window.addEventListener('pageshow',onFocus);
    return()=>{clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('pageshow',onFocus);};
  },[refresh]);
  const copy=async()=>{
    try{await navigator.clipboard.writeText(window.location.href);setCopied(true);
      setTimeout(()=>setCopied(false),1800);}catch{setMessage('Clipboard access was denied. Copy the URL from the browser address bar.');}
  };
  const startPayment=async()=>{
    if(busy||doc.status!=='OFFICIAL')return;
    setBusy(true);setMessage('');
    try {
      const res=await fetch(`/api/public/payment-documents/${token}/paypal`,{method:'POST',cache:'no-store'});
      const body=await res.json();
      if(!res.ok||body.error)throw new Error(body.errorMessage||'Unable to open payment checkout.');
      const target=new URL(body.data?.checkoutUrl);
      if(target.origin!==window.location.origin||!/^\/paypal\/checkout\/[a-f0-9]{64}$/.test(target.pathname))
        throw new Error('Invalid checkout destination.');
      window.location.assign(target.href);
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to start payment.');setBusy(false);}
  };
  return <div className="mx-auto max-w-[1080px] space-y-5 px-4 py-8 sm:px-6 lg:py-12">
    <div className="flex flex-col gap-4 rounded-2xl bg-[#17191e] p-5 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.17em] text-white/60">AutoCare customer document</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{doc.kind==='estimate'?'Estimate Details':'Final Cost Details'}</h1>
        <p className="mt-3 text-sm text-white/70">Tracking #{doc.appointment.trackingNumber} · Issued {date(doc.createdAt)}</p>
        <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusColor(doc.status)}`}>{doc.status.replaceAll('_',' ')}</span></div>
      <div className="rounded-xl border border-white/15 bg-white/10 p-4 sm:min-w-56"><p className="text-xs text-white/70">{doc.kind==='estimate'?'Estimated total':'Final Amount'}</p>
        <p className="mt-1 text-3xl font-extrabold">{fmt(doc.totals.grand)}</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#dedee4] bg-white px-4 text-sm font-semibold text-[#1d2026] hover:bg-[#f8f8fa] focus-visible:ring-2 focus-visible:ring-[#C1272D]"><Copy size={17}/>{copied?'Copied!':'Copy URL'}</button>
      <a href={`/api/public/payment-documents/${token}/pdf`} download className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#C1272D] px-4 text-sm font-semibold text-white hover:bg-[#a92227] focus-visible:ring-2 focus-visible:ring-[#C1272D]"><Download size={17}/>Download as PDF</a>
      <button type="button" onClick={()=>void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#dedee4] bg-white px-4 text-sm font-semibold hover:bg-[#f8f8fa] focus-visible:ring-2 focus-visible:ring-[#C1272D]"><RefreshCw size={16}/>Refresh status</button>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <section className={card}><h2 className="flex items-center gap-2 text-lg font-bold"><CalendarDays size={19} className="text-[#C1272D]"/>Appointment</h2>
        <dl className="mt-4 space-y-3 text-sm"><Info label="Customer" value={doc.customer.name}/><Info label="Tracking number" value={doc.appointment.trackingNumber}/>
          <Info label="Date" value={doc.appointment.date}/><Info label="Time" value={doc.appointment.time}/><Info label="Appointment status" value={doc.appointment.status}/>
          <Info label="Booking notes" value={doc.appointment.notes||'None'}/></dl></section>
      <section className={card}><h2 className="flex items-center gap-2 text-lg font-bold"><CarFront size={19} className="text-[#C1272D]"/>Vehicle</h2>
        <dl className="mt-4 space-y-3 text-sm"><Info label="Make" value={doc.vehicle.make}/><Info label="Model" value={doc.vehicle.model}/>
          <Info label="Year" value={String(doc.vehicle.year||'—')}/><Info label="Plate number" value={doc.vehicle.plateNumber||'—'}/></dl></section>
    </div>
    <section className={card}><Heading title="Booked services" subtitle="Catalog prices are reference prices; the saved subtotal below is authoritative."/>
      {doc.services.length? <div className="mt-4 divide-y divide-[#e5e5ea]">{doc.services.map((s,i)=><div key={i} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
        <div><h3 className="font-bold">{s.name}</h3><p className="mt-1 text-sm text-[#737880]">{s.type} · {s.estimatedDuration} minutes · Labor {s.laborIncluded?'included':'not included'}</p>
        {s.description&&<p className="mt-2 text-sm leading-6">{s.description}</p>}</div><div className="font-semibold">{fmt(s.catalogBasePrice)} <span className="block text-xs font-normal text-[#737880]">Base price</span></div></div>)}</div>
      :<Empty label="No catalog entries found for the booked services."/>}</section>
    <section className={card}><Heading title="Findings and parts"/>
      {doc.findings.length?<div className="mt-4 space-y-4">{doc.findings.map((finding,i)=><div key={i} className="rounded-lg border border-[#e5e5ea] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{finding.description}</h3>
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${finding.included?'bg-green-50 text-green-800':'bg-gray-100 text-gray-600'}`}>{finding.included?'Included':'Excluded'}</span></div>
        {finding.parts.length?<div className="mt-3 space-y-2 border-t pt-3">{finding.parts.map((part,j)=><div key={j} className="flex flex-wrap justify-between gap-2 text-sm">
          <p>{part.name} · {part.quantity} × {fmt(part.unitPrice)}{part.isPms?' · PMS':''}</p><strong>{fmt(part.total)}</strong></div>)}</div>:<p className="mt-2 text-sm text-[#737880]">No parts listed</p>}
        <p className="mt-3 text-right text-sm font-bold">Parts subtotal: {fmt(finding.partsSubtotal)}</p></div>)}</div>:<Empty label="No findings recorded."/>}</section>
    <section className={card}><Heading title="Service tasks"/>
      {doc.tasks.length?<ul className="mt-4 space-y-2">{doc.tasks.map((task,i)=><li key={i} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#f5f5f7] p-3 text-sm"><strong>{task.title}</strong>
        <span className="text-[#666b73]">{'status' in task?task.status:''}{'durationMinutes' in task&&task.durationMinutes!=null?` · ${task.durationMinutes} min`:''}</span></li>)}</ul>:<Empty label="No tasks recorded."/>}</section>
    <div className="grid gap-5 md:grid-cols-2"><section className={card}><Heading title="Additional fees"/>
      {doc.fees.length? <ul className="mt-4 space-y-2">{doc.fees.map((f,i)=><li key={i} className="flex justify-between gap-2 border-b py-2 text-sm"><span>{f.title}</span><strong>{fmt(f.amount)}</strong></li>)}</ul>:<Empty label="No additional fees."/>}</section>
      <section className={card}><Heading title="Discounts"/>{doc.discounts.length?<ul className="mt-4 space-y-2">{doc.discounts.map((d,i)=><li key={i} className="flex justify-between gap-2 border-b py-2 text-sm"><span>{d.title} ({d.type}: {d.value})</span><strong>-{fmt(d.amount)}</strong></li>)}</ul>:<Empty label="No discounts."/>}</section></div>
    <section className={card}><Heading title="Complete costing"/>
      <div className="mt-4 space-y-3"><Amount label="Service subtotal" n={doc.totals.service}/><Amount label="Findings / parts" n={doc.totals.findings}/>
        {doc.kind==='final-bill'&&<Amount label="Work tasks subtotal" n={doc.totals.workTasks}/>}
        <Amount label="Fees" n={doc.totals.fees}/><Amount label="Discounts" n={-doc.totals.discount}/>
        <div className="flex items-center justify-between border-t-2 border-[#e5e5ea] pt-4 text-lg font-extrabold"><span>Total</span><span className="text-[#C1272D]">{fmt(doc.totals.grand)}</span></div></div>
      {(doc.reason||doc.notes)&&<div className="mt-4 space-y-2 border-t pt-4 text-sm">{doc.reason&&<p><strong>Reason:</strong> {doc.reason}</p>}{doc.notes&&<p><strong>Final notes:</strong> {doc.notes}</p>}</div>}
    </section>
    {doc.diagnostics&&<section className={card}><Heading title="Diagnostic checklist" subtitle="Saved checklist statuses and inspection notes"/>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><Info label="Engine" value={doc.diagnostics.engineType||'—'}/><Info label="Transmission" value={doc.diagnostics.transmissionType||'—'}/><Info label="Time out" value={doc.diagnostics.timeOut||'—'}/></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{doc.diagnostics.sections.map((section,i)=><div key={i} className="rounded-lg border border-[#e5e5ea] p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#747981]">{section.title}</h3>
        <ul className="divide-y divide-[#f0f0f2]">{section.items.map((item,j)=><li key={j} className="flex justify-between gap-2 py-1.5 text-xs"><span>{item.label}</span>
          <span className={item.status==='REPLACE'?'font-bold text-red-700':item.status==='WARNING'?'font-bold text-amber-700':'text-[#747981]'}>{item.status}</span></li>)}</ul></div>)}</div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#e5e5ea] bg-white p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#747981]">Vehicle dent diagram</p>
        <svg viewBox="0 0 500 175" className="h-auto w-full" aria-label="Saved vehicle dent locations">
          <image href="/images/autocare-vehicle-dent-template.png" width="500" height="175" preserveAspectRatio="none"/>
          {doc.diagnostics.dentsMarks.map((mark,index)=><text key={index} x={mark.x} y={mark.y} fill="#C1272D" stroke="#ffffff" strokeWidth="0.6" paintOrder="stroke" fontSize="14" fontWeight="900">X</text>)}
        </svg>
      </div>
      <p className="mt-4 text-sm"><strong>Remarks:</strong> {doc.diagnostics.remarks||'None'}</p><p className="mt-2 text-sm"><strong>Dent notes:</strong> {doc.diagnostics.dentsNotes||'None'}</p>
      <p className="mt-2 text-sm"><strong>Dent coordinates:</strong> {doc.diagnostics.dentsMarks.map(m=>`(${m.x}, ${m.y})`).join(' · ')||'None'}</p>
    </section>}
    {doc.payment&&<section className={card}><h2 className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="text-emerald-600"/>Payment recorded</h2>
      <div className="mt-3 space-y-2 text-sm"><Info label="Receipt reference" value={doc.payment.referenceNumber}/>
        <Info label="Date" value={date(doc.payment.date)}/>{doc.payment.simulation&&<p className="font-semibold text-amber-800">CAPSTONE DEMONSTRATION — NO FUNDS COLLECTED</p>}</div></section>}
    {doc.kind==='final-bill'&&<section className={`${card} border-[#e8c4c5]`}><h2 className="flex items-center gap-2 text-xl font-bold"><WalletCards size={21} className="text-[#C1272D]"/>Pay online</h2>
      {doc.payable?<><p className="mt-2 text-sm leading-6 text-[#70757e]">Complete payment securely through PayPal. Payment methods depend on PayPal eligibility.</p>
        <button type="button" disabled={busy} onClick={()=>void startPayment()}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#C1272D] px-5 font-semibold text-white hover:bg-[#a82227] disabled:opacity-50 sm:w-auto">
          <ShieldCheck size={18}/>{busy?'Opening checkout…':'Continue to PayPal'}</button></>
      :<p className="mt-3 text-sm text-[#70757e]">{doc.status==='PAID'?'This Final Cost has been paid.':'Payment is unavailable until this Final Cost becomes OFFICIAL.'}</p>}
      {!!message&&<p role="alert" className="mt-3 flex items-center gap-2 text-sm text-[#b91c1c]"><AlertCircle size={18}/>{message}</p>}
      <p className="mt-4 text-xs text-[#777b83]">PayPal sandbox transactions are academic demonstrations and do not collect actual funds.</p>
    </section>}
    <p className="text-xs text-[#737880]">This is a private, time-limited document link. Forward it only to the intended customer. Information reflects AutoCare records at the time this page is opened.</p>
  </div>;
}
function Info({label,value}:{label:string;value:string}){return <div className="flex flex-col gap-0.5"><dt className="text-xs font-medium text-[#777b83]">{label}</dt><dd className="break-words font-semibold text-[#22252a]">{value||'—'}</dd></div>;}
function Heading({title,subtitle}:{title:string;subtitle?:string}){return <><h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardList className="text-[#C1272D]" size={19}/>{title}</h2>{subtitle&&<p className="mt-1 text-sm text-[#777b83]">{subtitle}</p>}</>;}
function Amount({label,n}:{label:string;n:number}){return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#62666e]">{label}</span><strong>{fmt(n)}</strong></div>;}
function Empty({label}:{label:string}){return <p className="mt-4 text-sm text-[#8a8d94]">{label}</p>;}
