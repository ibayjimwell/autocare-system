'use client';
import React, { useEffect, useState } from 'react';

export type WarrantyItem = {
  id: string; title: string; coverageType: string; provider: string;
  startDate: string; endDate: string; coverage: string; terms: string;
  exclusions?: string; claimInstructions: string; contact?: string;
  parts?: Array<{inventoryId?:string|null;partName:string}>;
};

/** Renders the whole warranty, with inventory parts and claim terms. */
export default function WarrantyDisplay({ warranties, documentId, kind, refreshKey = 0 }: {
  warranties?: WarrantyItem[]; documentId?: string; kind?: 'estimate'|'final-bill'; refreshKey?: number;
}) {
  const [items, setItems] = useState<WarrantyItem[]>(Array.isArray(warranties)?warranties:[]);
  const [loading,setLoading] = useState(false);
  useEffect(()=>{
    if (!documentId || !kind) {setItems(Array.isArray(warranties)?warranties:[]);return;}
    let active=true;
    setLoading(true);
    fetch(`/api/payments/${kind==='estimate'?'estimates':'final-bills'}/${encodeURIComponent(documentId)}`,{cache:'no-store'})
      .then(r=>r.json()).then(body=>{if(active&& !body.error)setItems(Array.isArray(body?.data?.warranties)?body.data.warranties:[]);})
      .catch(()=>{}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false};
  },[documentId,kind,refreshKey,warranties]);
  return <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Service warranties">
    <h3 className="text-base font-semibold">Service Warranty</h3>
    {loading && <p className="mt-2 text-xs text-muted-foreground">Loading warranties...</p>}
    {!items.length ? <p className="mt-2 text-sm text-muted-foreground">No warranty attached to this document.</p> :
    <div className="mt-3 space-y-3">{items.map(item=><article key={item.id} className="rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><strong>{item.title}</strong><span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{item.coverageType}</span></div>
      <p className="mt-1"><strong>Provider:</strong> {item.provider}</p>
      <p><strong>Coverage period:</strong> {item.startDate} to {item.endDate}</p>
      <p className="mt-2 whitespace-pre-wrap"><strong>Covered work:</strong> {item.coverage}</p>
      <p className="mt-1"><strong>Linked inventory parts:</strong> {(item.parts||[]).map(p=>p.partName).join(', ')||'None'}</p>
      <p className="mt-2 whitespace-pre-wrap"><strong>Terms:</strong> {item.terms}</p>
      <p className="mt-1 whitespace-pre-wrap"><strong>Exclusions:</strong> {item.exclusions||'None specified'}</p>
      <p className="mt-1 whitespace-pre-wrap"><strong>How to claim:</strong> {item.claimInstructions}</p>
      <p className="mt-1"><strong>Contact:</strong> {item.contact||'Contact AutoCare'}</p>
    </article>)}</div>}
  </section>;
}
