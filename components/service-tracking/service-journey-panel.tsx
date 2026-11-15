'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, TrendingDown } from 'lucide-react';

type TaskRow = {
  id: string;
  title: string;
  phase: string;
  status: string;
  baselineMinutes: number;
  extensionMinutes: number;
  effectiveMinutes: number;
  elapsedMinutes: number | null;
  completionPercent: number | null;
  finishedEarly: boolean;
};

type Timing = {
  status: 'EARLY' | 'DELAYED' | 'ON_TRACK';
  extendedCount: number;
  earlyCount: number;
  totalCount: number;
  unknownCount: number;
  isProjection: boolean;
  rows: TaskRow[];
};

type Journey = {
  status: string;
  customerMessage: string;
  inspection: { done: number; total: number };
  work: { done: number; total: number };
  progressPercent: number;
  phases: Array<{ key: string; label: string; state: string }>;
  timing: Timing;
  warranty?: { coverage: string; expiresAt: string } | null;
};

function formatMinutes(value: number) {
  return `${Math.round(value)} min`;
}

/** Staff-only explanation for the same indicator delivered to AutoCare Mobile. */
export default function ServiceJourneyPanel({ appointmentId }: { appointmentId: string; allowDelayEdit?: boolean }) {
  const [data, setData] = useState<Journey | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const response = await fetch(`/api/service-journey/${encodeURIComponent(appointmentId)}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.errorMessage || 'Unable to refresh service status.');
      }
      setData(result.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to refresh service status.');
    }
  }, [appointmentId]);

  useEffect(() => {
    setData(null);
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15_000);
    const onFocus = () => void refresh();
    const onTaskUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ appointmentId?: string }>).detail;
      if (detail?.appointmentId === appointmentId) void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('autocare-task-updated', onTaskUpdated);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('autocare-task-updated', onTaskUpdated);
    };
  }, [refresh]);

  if (!appointmentId) return null;
  const timing = data?.timing;
  const delayed = timing?.status === 'DELAYED';
  const early = timing?.status === 'EARLY';
  const isComplete = data?.status === 'COMPLETED';

  return (
    <section className="my-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Live Service Journey &amp; Task Indicator</h3>
        <Button type="button" size="sm" variant="ghost" onClick={() => void refresh()}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>
      {error ? <p className="text-xs text-amber-700" role="alert">{error}</p> : null}
      {!data ? <p className="text-sm text-muted-foreground">Loading task updates…</p> : (
        <>
          <p className="text-sm text-muted-foreground">{data.customerMessage}</p>
          <div className="flex flex-wrap gap-2">
            {data.phases?.map(phase => (
              <span key={phase.key} className={`rounded-full px-3 py-1 text-xs font-semibold ${
                phase.state === 'CURRENT' ? 'bg-primary text-primary-foreground'
                  : phase.state === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
              }`}>
                {phase.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Inspection {data.inspection?.done}/{data.inspection?.total} · Repair {data.work?.done}/{data.work?.total} · Completed tasks {data.progressPercent}%
          </p>

          <div className={`rounded-lg border p-4 ${
            delayed ? 'border-amber-300 bg-amber-50 text-amber-950'
              : early ? 'border-green-300 bg-green-50 text-green-950'
                : 'border-border bg-muted/30'
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {delayed ? <AlertTriangle className="h-4 w-4" />
                : early ? <TrendingDown className="h-4 w-4" />
                  : <Clock3 className="h-4 w-4" />}
              {delayed ? 'Service delay indicated'
                : early ? (isComplete ? 'Early completion indicated' : 'Service may finish early')
                  : 'No delay indicated'}
            </div>
            <p className="mt-1 text-sm">
              {delayed
                ? `${timing?.extendedCount ?? 0} task(s) have an extended estimated duration. An extension takes priority over early completions.`
                : early
                  ? `${timing?.earlyCount ?? 0} task(s) finished in less than 80% of their original estimated duration, with no extended tasks.`
                  : 'No tasks have been extended, and no completed task qualifies as an early finish.'}
            </p>
            <p className="mt-1 text-xs opacity-80">
              This is a simple task-based indicator, not a prediction of the vehicle's actual delivery time.
            </p>
          </div>

          {timing ? (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-sm font-semibold">Why this indicator appears</h4>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><span className="text-muted-foreground">Extended tasks</span><br /><strong>{timing.extendedCount}</strong></div>
                <div><span className="text-muted-foreground">Early-finished tasks</span><br /><strong>{timing.earlyCount}</strong></div>
                <div><span className="text-muted-foreground">All tasks considered</span><br /><strong>{timing.totalCount}</strong></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Rules: any extension = delayed; otherwise, at least one task finished in under 80% of its original estimate = early; otherwise, no delay. Inspection results are retained when repair begins. No minute-by-minute net calculation.
              </p>
              <div className="max-h-64 space-y-1 overflow-auto">
                {timing.rows.length === 0 ? <p className="text-xs text-muted-foreground">No tasks recorded for this phase.</p> : null}
                {timing.rows.map(row => (
                  <div key={`${row.phase}-${row.id}`} className="flex flex-wrap items-start justify-between gap-2 border-t py-2 text-xs">
                    <span className="font-medium">
                      {row.title}
                      <span className="text-muted-foreground"> ({row.phase.toLowerCase()}, {row.status.toLowerCase().replaceAll('_', ' ')})</span>
                    </span>
                    <span className="text-right">
                      Original {formatMinutes(row.baselineMinutes)}
                      {row.extensionMinutes > 0 ? ` · Delayed (extended +${formatMinutes(row.extensionMinutes)})` : ''}
                      {row.finishedEarly && row.extensionMinutes === 0 ? ` · Finished early (${Math.round(row.completionPercent ?? 0)}% of estimate)` : ''}
                      {row.status === 'DONE' && row.extensionMinutes === 0 && !row.finishedEarly && row.completionPercent !== null
                        ? ` · Finished at ${Math.round(row.completionPercent)}% of estimate`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
              {timing.unknownCount > 0 ? (
                <p className="text-xs text-amber-700">
                  {timing.unknownCount} historical completed task(s) lack reliable start/finish timestamps and cannot be classified as early.
                </p>
              ) : null}
            </div>
          ) : null}

          {data.warranty ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              Warranty: {data.warranty.coverage}, until {new Date(data.warranty.expiresAt).toLocaleDateString('en-PH')}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
