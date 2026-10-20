'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Loader2, Cloud, CloudCheck, CloudAlert, LockKeyhole, CheckCircle2 } from 'lucide-react';
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

function ConditionTable({
  side,
  statuses,
  mark,
  busy,
  readOnly,
  onMarkSectionGood,
  sectionBusyId,
}: {
  side: 'left' | 'right';
  statuses: Map<string, DiagnosticStatus>;
  mark: (itemKey: string, status: DiagnosticStatus | null) => Promise<void>;
  busy: string | null;
  readOnly: boolean;
  onMarkSectionGood: (sectionId: string, sectionTitle: string, itemKeys: string[]) => Promise<void>;
  sectionBusyId: string | null;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-[11px] sm:text-xs" aria-label={`${side} diagnostic checklist`}>
      <colgroup>
        <col />
        <col className="w-[52px] sm:w-[64px]" />
        <col className="w-[52px] sm:w-[64px]" />
        <col className="w-[52px] sm:w-[64px]" />
      </colgroup>
      <thead>
        <tr>
          <th className="border border-neutral-500 bg-neutral-100 px-2 py-2 text-left font-extrabold">CHECKLIST</th>
          {CHOICES.map(choice => (
            <th key={choice.status} className={`border border-neutral-500 px-0.5 py-2 text-center font-bold ${choice.tint}`}>
              {choice.name}
            </th>
          ))}
        </tr>
      </thead>
      {DIAGNOSTIC_SECTIONS.filter(section => section.column === side).map(section => {
        const sectionItemKeys = section.items.map(([key]) => String(key));
        const isSectionBusy = sectionBusyId === section.id;
        const allSectionGood = sectionItemKeys.every(key => statuses.get(key) === 'GOOD');

        return (
          <tbody key={section.id}>
            <tr>
              <th colSpan={4} className="border border-neutral-500 bg-neutral-200 px-2 py-1.5 text-neutral-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-left text-sm font-extrabold tracking-wide">
                    {section.title}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant={allSectionGood ? 'secondary' : 'outline'}
                    disabled={readOnly || Boolean(busy) || isSectionBusy}
                    className="h-8 gap-1.5 px-2.5 text-[11px] font-semibold"
                    onClick={() => void onMarkSectionGood(section.id, section.title, sectionItemKeys)}
                  >
                    {isSectionBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Check all Good
                      </>
                    )}
                  </Button>
                </div>
              </th>
            </tr>
            {section.items.map(([key, label]) => (
              <tr key={key}>
                <th className="break-words border border-neutral-500 bg-white px-2 py-1.5 text-left font-medium text-neutral-900">{label}</th>
                {CHOICES.map(choice => {
                  const checked = statuses.get(key) === choice.status;
                  return (
                    <td key={choice.status} className={`border border-neutral-500 p-0 ${choice.tint}`}>
                      <button
                        type="button"
                        aria-label={`${label}: ${choice.name}`}
                        aria-pressed={checked}
                        disabled={readOnly || Boolean(busy) || isSectionBusy}
                        onClick={() => void mark(String(key), checked ? null : choice.status)
                          .catch((error: any) => toast.error(error?.message || 'Unable to update checklist item.'))}
                        className={`flex min-h-[33px] w-full items-center justify-center text-base font-black transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 ${
                          readOnly || isSectionBusy ? 'cursor-not-allowed opacity-90' : 'hover:brightness-95'
                        } ${checked ? `ring-2 ring-inset ${choice.active}` : ''}`}
                      >
                        {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : checked ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        );
      })}
    </table>
  );
}

function VehicleDentOutline({
  marks,
  onChange,
  readOnly,
}: {
  marks: Array<{ x: number; y: number }>;
  onChange: (marks: Array<{ x: number; y: number }>) => void;
  readOnly: boolean;
}) {
  /*
   * The background is the generated, clearly illustrated three-view
   * sedan diagram. The image already contains its title and side labels.
   * Coordinates remain 500 x 175 so previously saved dent marks do
   * not require a database migration.
   */
  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(500, Math.round(((event.clientX - rect.left) / rect.width) * 500)));
    const y = Math.max(0, Math.min(175, Math.round(((event.clientY - rect.top) / rect.height) * 175)));
    const nearby = marks.findIndex(mark => Math.hypot(mark.x - x, mark.y - y) < 15);
    onChange(nearby >= 0 ? marks.filter((_, index) => index !== nearby) : [...marks, { x, y }]);
  };

  return (
    <svg
      viewBox="0 0 500 175"
      preserveAspectRatio="none"
      onClick={handleClick}
      className={`aspect-[1817/866] h-auto w-full max-w-[620px] select-none ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
      aria-label="Three-view vehicle dent diagram: tap to add or remove a dent marker"
      role="img"
      style={{ touchAction: 'manipulation' }}
    >
      <image
        href="/images/autocare-vehicle-dent-template.png"
        x="0"
        y="0"
        width="500"
        height="175"
        preserveAspectRatio="none"
      />
      {marks.map((mark, index) => (
        <text
          key={`${mark.x}-${mark.y}-${index}`}
          x={mark.x}
          y={mark.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#C1272D"
          stroke="#FFFFFF"
          strokeWidth="0.7"
          paintOrder="stroke"
          fontWeight="900"
          fontSize="11"
          pointerEvents="none"
        >
          X
        </text>
      ))}
    </svg>
  );
}

export default function DiagnosticChecklistModal({ open, onOpenChange, appointment, onFindingsChanged }: Props) {
  const readOnly = appointment?.status === 'IN_PROGRESS' || appointment?.status === 'COMPLETED';
  const checklist = useDiagnosticChecklist(String(appointment?.id || ''), open, readOnly);
  const { mark, statuses, selectedItemKey, closeSuggestions } = checklist;
  const showingSidePanel = !readOnly && Boolean(selectedItemKey);
  const [sectionBusyId, setSectionBusyId] = useState<string | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open || readOnly) closeSuggestions();
  }, [open, readOnly, closeSuggestions]);

  // Flush the newest typed notes / dent points before dismissing the dialog.
  // If the network fails, keep the checklist open so unsaved edits remain.
  const closeChecklist = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    try {
      await checklist.flushNotes();
      closeSuggestions();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save checklist changes. Check your connection before closing.');
    } finally {
      closingRef.current = false;
      setClosing(false);
    }
  };


  const handleMarkSectionGood = async (sectionId: string, sectionTitle: string, itemKeys: string[]) => {
    if (readOnly || sectionBusyId || checklist.savingItem) return;

    const targets = itemKeys.filter(itemKey => !checklist.statuses.has(itemKey));
    if (targets.length === 0) {
      toast.success(`${sectionTitle} is already checked as Good.`);
      return;
    }

    setSectionBusyId(sectionId);
    try {
      for (const itemKey of targets) {
        await checklist.mark(itemKey, 'GOOD');
      }
      toast.success(`${sectionTitle} marked as Good.`);
    } catch (error: any) {
      toast.error(error?.message || `Unable to mark ${sectionTitle} as Good.`);
    } finally {
      setSectionBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next) onOpenChange(true);
        else void closeChecklist();
      }}
    >
      <DialogContent
        className={`flex !h-[min(94dvh,1050px)] !max-h-[94dvh] !w-[calc(100vw-0.75rem)] flex-col !gap-0 overflow-hidden rounded-xl p-0 sm:!w-[96vw] ${
          showingSidePanel ? '!max-w-[1680px]' : '!max-w-[1350px]'
        }`}
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Vehicle Diagnostic Checklist</DialogTitle>
                <DialogDescription className="mt-1">
                  Tracking #{appointment?.trackingNumber || '—'} · {readOnly
                    ? 'Review the saved checklist. Editing is disabled during active or completed work.'
                    : 'Check each component as Good, Warning, or Replace.'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {readOnly && <Badge variant="secondary" className="gap-1"><LockKeyhole className="h-3 w-3" />Read only</Badge>}
              <Badge className="bg-green-700">{checklist.totals.GOOD} Good</Badge>
              <Badge className="bg-amber-600">{checklist.totals.WARNING} Warning</Badge>
              <Badge className="bg-red-700">{checklist.totals.REPLACE} Replace</Badge>
              <Badge variant="outline">{checklist.totals.unchecked} unchecked</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className={`grid min-h-0 flex-1 ${
          showingSidePanel
            ? 'grid-rows-[minmax(0,1fr)_minmax(220px,42%)] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1'
            : 'grid-cols-1'
        }`}>
          <div className="min-h-0 min-w-0 overflow-y-auto bg-[#F5F5F2] p-2 text-neutral-900 sm:p-4 lg:p-5">
            <div className="mx-auto max-w-[1240px] rounded-lg border border-neutral-300 bg-white p-2 shadow-sm sm:p-4 lg:p-5">
              <div className="mb-4 grid grid-cols-1 gap-2 border-b border-neutral-400 pb-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                <p><b>Customer:</b> {appointment?.customer?.fullname || '—'}</p>
                <p><b>Vehicle:</b> {[appointment?.vehicle?.year, appointment?.vehicle?.make, appointment?.vehicle?.model].filter(Boolean).join(' ') || '—'}</p>
                <p><b>Plate:</b> {appointment?.vehicle?.plateNumber || '—'}</p>
                <p><b>Appointment:</b> #{appointment?.trackingNumber || '—'}</p>
              </div>

              <div className="mb-4 flex flex-wrap gap-3 border-b border-neutral-300 pb-4 text-xs">
                <div>
                  <p className="mb-1 font-semibold">Engine type</p>
                  <div className="flex gap-1">
                    {(['GAS', 'DIESEL', 'EV'] as const).map(value => (
                      <Button
                        type="button"
                        size="sm"
                        key={value}
                        variant={checklist.engineType === value ? 'default' : 'outline'}
                        disabled={readOnly || checklist.loading}
                        onClick={() => checklist.setEngineType(checklist.engineType === value ? null : value)}
                      >{value}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 font-semibold">Transmission</p>
                  <div className="flex gap-1">
                    {(['MT', 'AT'] as const).map(value => (
                      <Button
                        type="button"
                        size="sm"
                        key={value}
                        variant={checklist.transmissionType === value ? 'default' : 'outline'}
                        disabled={readOnly || checklist.loading}
                        onClick={() => checklist.setTransmissionType(checklist.transmissionType === value ? null : value)}
                      >{value}</Button>
                    ))}
                  </div>
                </div>
              </div>

              {checklist.loading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                  <ConditionTable
                    side="left"
                    statuses={statuses}
                    mark={mark}
                    busy={checklist.savingItem}
                    readOnly={readOnly}
                    onMarkSectionGood={handleMarkSectionGood}
                    sectionBusyId={sectionBusyId}
                  />
                  <div className="space-y-5">
                    <ConditionTable
                      side="right"
                      statuses={statuses}
                      mark={mark}
                      busy={checklist.savingItem}
                      readOnly={readOnly}
                      onMarkSectionGood={handleMarkSectionGood}
                      sectionBusyId={sectionBusyId}
                    />
                    <section className="border-t border-neutral-400 pt-4">
                      {/* The supplied illustration already contains the section
                          heading and DRIVER SIDE / PASSENGER SIDE labels. */}
                      <div className="flex justify-center">
                        <VehicleDentOutline marks={checklist.dentsMarks} onChange={checklist.setDentsMarks} readOnly={readOnly} />
                      </div>
                      <p className="mt-1 text-center text-[10px] text-neutral-500">
                        {readOnly ? 'Saved dent locations (read-only).' : 'Tap the vehicle diagram to place an X. Tap near an existing X to remove it.'}
                      </p>
                      <Textarea
                        value={checklist.dentsNotes}
                        onChange={event => checklist.setDentsNotes(event.target.value)}
                        placeholder="Dent locations and observations"
                        className="mt-2 min-h-20 text-xs"
                        maxLength={5000}
                        readOnly={readOnly}
                        disabled={readOnly}
                      />
                      <h3 className="mb-2 mt-4 text-sm font-bold">Remarks</h3>
                      <Textarea
                        value={checklist.remarks}
                        onChange={event => checklist.setRemarks(event.target.value)}
                        placeholder="Additional diagnostic notes"
                        className="min-h-24 text-xs"
                        maxLength={5000}
                        readOnly={readOnly}
                        disabled={readOnly}
                      />
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showingSidePanel && (
            <SuggestedFindingsModal
              open={showingSidePanel}
              onOpenChange={next => { if (!next) closeSuggestions(); }}
              itemKey={selectedItemKey}
              findings={checklist.suggestions}
              loading={checklist.suggestionsLoading}
              onAdd={checklist.addFinding}
              onCreate={checklist.createLinkedFinding}
              onFindingsChanged={onFindingsChanged}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-card p-3 sm:px-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {readOnly ? (
              <>
                <LockKeyhole className="h-4 w-4" />
                Read-only: view and print saved results.
              </>
            ) : checklist.notesSaveStatus === 'error' ? (
              <>
                <CloudAlert className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Auto-save failed. Your edits are still here.</span>
                <Button type="button" size="sm" variant="outline" className="h-7"
                  onClick={() => void checklist.flushNotes().catch((error: any) => toast.error(error?.message || 'Save failed.'))}>
                  Retry
                </Button>
              </>
            ) : checklist.notesSaveStatus === 'pending' || checklist.notesSaveStatus === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {checklist.notesSaveStatus === 'pending' ? 'Auto-saving changes shortly...' : 'Saving checklist changes...'}
              </>
            ) : (
              <>
                {checklist.notesSaveStatus === 'saved'
                  ? <CloudCheck className="h-4 w-4 text-green-700" />
                  : <Cloud className="h-4 w-4" />}
                {checklist.notesSaveStatus === 'saved'
                  ? 'All remarks, checks, and dent marks save automatically.'
                  : 'Changes save automatically.'}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <DiagnosticChecklistPrintButton
              appointment={appointment}
              statuses={statuses}
              remarks={checklist.remarks}
              dentsNotes={checklist.dentsNotes}
              engineType={checklist.engineType}
              transmissionType={checklist.transmissionType}
              dentsMarks={checklist.dentsMarks}
              disabled={checklist.loading || Boolean(checklist.savingItem) || Boolean(sectionBusyId)}
            />
            <Button variant="outline" className="h-10" disabled={closing} onClick={() => void closeChecklist()}>
              {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {closing ? 'Saving...' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
