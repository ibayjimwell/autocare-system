'use client';

import { useEffect, useState } from 'react';
import { DIAGNOSTIC_SECTIONS } from '@/lib/diagnostic-checklist/catalog';
import { ClipboardCheck, Loader2 } from 'lucide-react';

export default function DiagnosticChecklistReadOnly({ appointmentId }: { appointmentId?: string | null }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!appointmentId) { setData(null); return; }
    const abort = new AbortController();
    const fetchChecklist = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/service-tracking/diagnostic-checklists?appointmentId=${encodeURIComponent(appointmentId)}`, {
          method: 'GET', cache: 'no-store', signal: abort.signal,
        });
        const body = await res.json();
        if (!res.ok || body?.error) throw new Error(body?.errorMessage || 'Checklist unavailable.');
        if (!abort.signal.aborted) setData(body.data);
      } catch (error) { if (!abort.signal.aborted) { console.error('[Diagnostic Checklist Viewer]', error); setData(null); } }
      finally { if (!abort.signal.aborted) setLoading(false); }
    };
    void fetchChecklist();
    return () => abort.abort();
  }, [appointmentId]);
  if (!appointmentId) return null;
  const checklist = data?.checklist;
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const statuses = new Map(entries.map((entry: any) => [entry.itemKey, entry.status]));
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4" aria-label="Read-only diagnostic checklist">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4" />Diagnostic Checklist</h3>
        <span className="text-xs text-muted-foreground">Read only</span>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : !checklist ? <p className="text-xs text-muted-foreground">No diagnostic checklist recorded for this appointment.</p> : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Engine: {checklist.engineType || '—'} · Transmission: {checklist.transmissionType || '—'}</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {DIAGNOSTIC_SECTIONS.map(section => (
              <div key={section.id} className="min-w-0 rounded-md border p-2">
                <h4 className="mb-1 text-xs font-bold uppercase">{section.title}</h4>
                {section.items.map(([key, label]) => (
                  <div key={key} className="flex items-start justify-between gap-2 border-t py-1.5 text-xs">
                    <span className="min-w-0 break-words">{label}</span>
                    <span className={`shrink-0 font-semibold ${statuses.get(key) === 'REPLACE' ? 'text-red-700' : statuses.get(key) === 'WARNING' ? 'text-amber-700' : statuses.get(key) === 'GOOD' ? 'text-green-700' : 'text-muted-foreground'}`}>{String(statuses.get(key) || 'Unchecked')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {checklist.remarks && <p className="whitespace-pre-wrap text-xs"><b>Remarks:</b> {checklist.remarks}</p>}
          {checklist.dentsNotes && <p className="whitespace-pre-wrap text-xs"><b>Dents:</b> {checklist.dentsNotes}</p>}
          <div className="relative mx-auto w-full max-w-[600px]">
            <svg viewBox="0 0 500 175" className="h-auto w-full" aria-label="Saved vehicle dent marks">
              <image href="/images/autocare-vehicle-dent-template.png" width="500" height="175" preserveAspectRatio="none" />
              {(Array.isArray(checklist.dentsMarks) ? checklist.dentsMarks : []).map((mark: any, i: number) => <text key={i} x={mark.x} y={mark.y} fill="#C1272D" fontSize="15" fontWeight="bold">X</text>)}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
