'use client';
import { useEffect, type MouseEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Loader2, Save } from 'lucide-react';
import { DIAGNOSTIC_SECTIONS, type DiagnosticStatus } from '@/lib/diagnostic-checklist/catalog';
import { useDiagnosticChecklist } from '@/hooks/diagnostic-checklist/useDiagnosticChecklist';
import SuggestedFindingsModal from './SuggestedFindingsModal';
import DiagnosticChecklistPrintButton from './DiagnosticChecklistPrintButton';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onFindingsChanged: () => void | Promise<void>;
}
const CHOICES = [
  { status: 'GOOD' as const, name: 'Good', tint: 'bg-[#88BE9A]', active: 'ring-green-900' },
  { status: 'WARNING' as const, name: 'Warning', tint: 'bg-[#E9D16A]', active: 'ring-yellow-900' },
  { status: 'REPLACE' as const, name: 'Replace', tint: 'bg-[#DC8D88]', active: 'ring-red-900' },
];

function ConditionTable({ side, statuses, mark, busy }: {
  side: 'left' | 'right';
  statuses: Map<string, DiagnosticStatus>;
  mark: (itemKey: string, status: DiagnosticStatus | null) => Promise<void>;
  busy: string | null;
}) {
  return <table className="w-full table-fixed border-collapse text-[11px] sm:text-xs" aria-label={`${side} diagnostic checklist`}>
    <colgroup><col/><col className="w-[52px] sm:w-[64px]"/><col className="w-[52px] sm:w-[64px]"/><col className="w-[52px] sm:w-[64px]"/></colgroup>
    <thead><tr><th className="border border-neutral-500 bg-neutral-100 px-2 py-2 text-left font-extrabold">CHECKLIST</th>
      {CHOICES.map(choice => <th key={choice.status} className={`border border-neutral-500 px-0.5 py-2 text-center font-bold ${choice.tint}`}>{choice.name}</th>)}
    </tr></thead>
    {DIAGNOSTIC_SECTIONS.filter(section => section.column === side).map(section => <tbody key={section.id}>
      <tr><th colSpan={4} className="border border-neutral-500 bg-neutral-200 px-2 py-1.5 text-center text-sm font-extrabold tracking-wide text-neutral-900">{section.title}</th></tr>
      {section.items.map(([key, label]) => <tr key={key}>
        <th className="break-words border border-neutral-500 bg-white px-2 py-1.5 text-left font-medium text-neutral-900">{label}</th>
        {CHOICES.map(choice => {
          const checked = statuses.get(key) === choice.status;
          return <td key={choice.status} className={`border border-neutral-500 p-0 ${choice.tint}`}>
            <button type="button" aria-label={`${label}: ${choice.name}`} aria-pressed={checked} disabled={Boolean(busy)}
              onClick={() => void mark(key, checked ? null : choice.status).catch((e: any) => toast.error(e?.message || 'Unable to update checklist item.'))}
              className={`flex min-h-[33px] w-full items-center justify-center text-base font-black transition-all hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 ${checked ? `ring-2 ring-inset ${choice.active}` : ''}`}>{busy === key ? <Loader2 className="h-4 w-4 animate-spin"/> : checked ? '✓' : ''}</button>
          </td>;
        })}
      </tr>)}
    </tbody>)}
  </table>;
}

function VehicleDentOutline({ marks, onChange }: { marks: Array<{x:number;y:number}>; onChange: (marks: Array<{x:number;y:number}>) => void }) {
  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 500);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 175);
    const nearby = marks.findIndex(mark => Math.hypot(mark.x - x, mark.y - y) < 15);
    onChange(nearby >= 0 ? marks.filter((_, idx) => idx !== nearby) : [...marks, { x, y }]);
  };
  return <svg viewBox="0 0 500 175" onClick={handleClick} className="h-auto w-full max-w-md cursor-crosshair text-neutral-600" aria-label="Vehicle top view for dent reference" role="img">
    <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round">
      <rect x="106" y="31" width="288" height="114" rx="43"/>
      <path d="M188 31 L203 7 H302 L317 31 M188 145 L203 168 H302 L317 145"/>
      <path d="M200 33 L200 143 M302 33 L302 143 M200 58 L302 58 M200 119 L302 119"/>
      <path d="M119 50 L177 50 M119 127 L177 127 M323 50 L381 50 M323 127 L381 127"/>
      <rect x="85" y="35" width="21" height="44" rx="6"/><rect x="85" y="101" width="21" height="44" rx="6"/>
      <rect x="394" y="35" width="21" height="44" rx="6"/><rect x="394" y="101" width="21" height="44" rx="6"/>
    </g>
    {marks.map((mark, index) => <text key={`${mark.x}-${mark.y}-${index}`} x={mark.x} y={mark.y} textAnchor="middle" dominantBaseline="middle" fill="#C1272D" fontWeight="bold" fontSize="24">×</text>)}
  </svg>;
}

export default function DiagnosticChecklistModal({ open, onOpenChange, appointment, onFindingsChanged }: Props) {
  const checklist = useDiagnosticChecklist(String(appointment?.id || ''), open);
  const { mark, statuses, selectedItemKey, closeSuggestions } = checklist;
  useEffect(() => { if (!open) closeSuggestions(); }, [open]);
  const saveNotes = async () => {
    try { await checklist.saveNotes(); toast.success('Diagnostic remarks saved.'); }
    catch (error: any) { toast.error(error?.message || 'Unable to save remarks.'); }
  };
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[min(94vh,1000px)] !max-h-[94vh] !w-[calc(100vw-0.75rem)] !max-w-[1350px] flex-col overflow-hidden rounded-xl p-0 sm:!w-[94vw]">
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><ClipboardCheck className="h-5 w-5"/></div>
              <div><DialogTitle className="text-xl">Vehicle Diagnostic Checklist</DialogTitle>
                <DialogDescription className="mt-1">Tracking #{appointment.trackingNumber || '—'} · Check each component as Good, Warning, or Replace.</DialogDescription>
              </div></div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge className="bg-green-700">{checklist.totals.GOOD} Good</Badge>
              <Badge className="bg-amber-600">{checklist.totals.WARNING} Warning</Badge>
              <Badge className="bg-red-700">{checklist.totals.REPLACE} Replace</Badge>
              <Badge variant="outline">{checklist.totals.unchecked} unchecked</Badge>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F5F2] p-2 text-neutral-900 sm:p-4 lg:p-6">
          <div className="mx-auto max-w-[1240px] rounded-lg border border-neutral-300 bg-white p-2 shadow-sm sm:p-4 lg:p-6">
            <div className="mb-4 grid grid-cols-1 gap-2 border-b border-neutral-400 pb-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <p><b>Customer:</b> {appointment.customer?.fullname || '—'}</p>
              <p><b>Vehicle:</b> {[appointment.vehicle?.year, appointment.vehicle?.make, appointment.vehicle?.model].filter(Boolean).join(' ') || '—'}</p>
              <p><b>Plate:</b> {appointment.vehicle?.plateNumber || '—'}</p>
              <p><b>Appointment:</b> {appointment.appointmentDate || '—'}</p>
            </div>
            <div className="mb-4 flex flex-wrap gap-3 border-b border-neutral-300 pb-4 text-xs">
              <div><p className="mb-1 font-semibold">Engine type</p><div className="flex gap-1">{(['GAS','DIESEL'] as const).map(value => <Button type="button" size="sm" key={value} variant={checklist.engineType === value ? 'default' : 'outline'} onClick={() => checklist.setEngineType(checklist.engineType === value ? null : value)}>{value}</Button>)}</div></div>
              <div><p className="mb-1 font-semibold">Transmission</p><div className="flex gap-1">{(['MT','AT'] as const).map(value => <Button type="button" size="sm" key={value} variant={checklist.transmissionType === value ? 'default' : 'outline'} onClick={() => checklist.setTransmissionType(checklist.transmissionType === value ? null : value)}>{value}</Button>)}</div></div>
              <div><p className="mb-1 font-semibold">Time out</p><Input type="time" className="h-9 w-36" value={checklist.timeOut || ''} onChange={event => checklist.setTimeOut(event.target.value || null)}/></div>
            </div>
            {checklist.loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div>
              : <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <ConditionTable side="left" statuses={statuses} mark={mark} busy={checklist.savingItem}/>
                <div className="space-y-5">
                  <ConditionTable side="right" statuses={statuses} mark={mark} busy={checklist.savingItem}/>
                  <section className="border-t border-neutral-400 pt-4">
                    <h3 className="mb-2 text-center text-sm font-bold">MARK (X) IN DENTS</h3>
                    <p className="mb-1 text-center text-[11px] font-bold tracking-widest">DRIVER SIDE</p>
                    <div className="flex justify-center"><VehicleDentOutline marks={checklist.dentsMarks} onChange={checklist.setDentsMarks}/></div>
                    <p className="text-center text-[10px] text-neutral-500">Tap the vehicle to place an X. Tap near an X to remove it.</p>
                    <p className="text-center text-[11px] font-bold tracking-widest">PASSENGER SIDE</p>
                    <Textarea value={checklist.dentsNotes} onChange={event => checklist.setDentsNotes(event.target.value)}
                      className="mt-2 min-h-16 bg-white text-xs" placeholder="Dent locations / marks observed..."/>
                  </section>
                  <section><h3 className="mb-2 text-sm font-bold">REMARKS</h3>
                    <Textarea value={checklist.remarks} onChange={event => checklist.setRemarks(event.target.value)}
                      className="min-h-28 bg-white" placeholder="Write inspection observations..."/></section>
                </div>
              </div>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-card p-3 sm:px-5">
          <span className="text-xs text-muted-foreground">Selections save automatically. Save remarks separately.</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10" disabled={checklist.notesSaving || checklist.loading} onClick={() => void saveNotes()}>
              {checklist.notesSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}Save Remarks
            </Button>
            <DiagnosticChecklistPrintButton appointment={appointment} statuses={statuses}
              remarks={checklist.remarks} dentsNotes={checklist.dentsNotes} engineType={checklist.engineType} transmissionType={checklist.transmissionType} timeOut={checklist.timeOut} dentsMarks={checklist.dentsMarks} disabled={checklist.loading || Boolean(checklist.savingItem)}/>
            <Button variant="outline" className="h-10" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <SuggestedFindingsModal open={open && Boolean(selectedItemKey)} onOpenChange={next => { if (!next) closeSuggestions(); }}
      itemKey={selectedItemKey} findings={checklist.suggestions} loading={checklist.suggestionsLoading}
      onAdd={checklist.addFinding} onFindingsChanged={onFindingsChanged}/>
  </>;
}
