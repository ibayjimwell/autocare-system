'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CarFront, Clock3, RefreshCw, Wrench } from 'lucide-react';
import type { PublicQueueFeed, PublicQueueVehicle } from '@/lib/public-landing';

const POLL_MS = 45_000;

function timeLabel(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return 'Scheduled today';
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return 'Scheduled today';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function QueueRow({ item }: { item: PublicQueueVehicle }) {
  return (
    <li className="ac-queue-row group flex min-w-0 gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3.5 transition-colors hover:bg-white/[0.095] sm:p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/90">
        <CarFront aria-hidden="true" size={21} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h3 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{item.vehicle}</h3>
          <span className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide text-white/75">{item.plate}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/65">
          {item.services.length ? item.services.join(' · ') : 'Scheduled automotive service'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1"><Clock3 size={12} aria-hidden="true" />{timeLabel(item.time)}</span>
          {item.queueNumber != null && <span>Queue #{item.queueNumber}</span>}
        </div>
      </div>
    </li>
  );
}

export default function LiveWorkshopQueue({ initialFeed }: { initialFeed: PublicQueueFeed }) {
  const [feed, setFeed] = useState(initialFeed);
  const [tab, setTab] = useState<'CONFIRMED' | 'IN_PROGRESS'>('CONFIRMED');
  const [refreshing, setRefreshing] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);

  const activeRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch('/api/public/live-queue', {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Queue refresh unavailable');
      const data = await response.json() as PublicQueueFeed;
      if (!data || !Array.isArray(data.confirmed) || !Array.isArray(data.inProgress)) {
        throw new Error('Invalid public queue response');
      }
      if (activeRef.current && !controller.signal.aborted) {
        setFeed(data);
        setConnectionIssue(false);
      }
    } catch (error) {
      if (activeRef.current && !(error instanceof Error && error.name === 'AbortError')) {
        setConnectionIssue(true);
      }
    } finally {
      if (activeRef.current && controllerRef.current === controller) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const poll = window.setInterval(() => { void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      activeRef.current = false;
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      controllerRef.current?.abort();
    };
  }, [refresh]);

  const items = tab === 'CONFIRMED' ? feed.confirmed : feed.inProgress;
  const total = feed.confirmed.length + feed.inProgress.length;
  const updated = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
  }).format(new Date(feed.updatedAt));

  return (
    <div className="ac-queue-panel relative isolate w-full max-w-[540px] overflow-hidden rounded-[22px] border border-white/20 bg-[#171a20]/95 text-white shadow-[0_28px_90px_rgba(0,0,0,.5)]">
      <div className="ac-queue-topline" aria-hidden="true" />
      <div className="border-b border-white/10 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="ac-live-dot" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ff9b9b]">Live workshop board</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[27px]">Today&apos;s queue</h2>
            <p className="mt-1 text-xs text-white/55">{feed.dateLabel} · Philippine time</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">{total} visible</span>
            <span className="text-[10px] text-white/45">Updated {updated}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-black/35 p-1" role="group" aria-label="Workshop queue status filter">
          {([
            { id: 'CONFIRMED', label: 'Confirmed', count: feed.confirmed.length },
            { id: 'IN_PROGRESS', label: 'In progress', count: feed.inProgress.length },
          ] as const).map(entry => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={tab === entry.id}
              aria-controls="public-queue-list"
              onClick={() => setTab(entry.id)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8f94] sm:text-sm ${
                tab === entry.id ? 'bg-white text-[#191b20] shadow-sm' : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              {entry.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${tab === entry.id ? 'bg-black/10' : 'bg-white/10'}`}>
                {entry.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div id="public-queue-list" role="region" aria-label={`${tab === 'CONFIRMED' ? 'Confirmed' : 'In-progress'} vehicle queue`} className="min-h-[245px] px-4 py-4 sm:px-5">
        {feed.unavailable ? (
          <div role="status" className="flex min-h-[215px] flex-col items-center justify-center gap-2 text-center">
            <RefreshCw size={22} className="text-white/45" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Queue is temporarily unavailable</p>
            <p className="max-w-xs text-xs leading-6 text-white/55">Please check back shortly. Your personal appointment details are still available in AutoCare Mobile.</p>
          </div>
        ) : items.length === 0 ? (
          <div role="status" className="flex min-h-[215px] flex-col items-center justify-center gap-2 text-center">
            <div className="mb-1 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Wrench size={23} className="text-white/55" aria-hidden="true" /></div>
            <p className="text-sm font-semibold text-white">No {tab === 'CONFIRMED' ? 'confirmed' : 'in-progress'} jobs listed</p>
            <p className="max-w-xs text-xs leading-6 text-white/55">Nothing in this queue for today. Statuses update automatically as the workshop progresses.</p>
          </div>
        ) : (
          <ul className="space-y-2.5" aria-live="polite" aria-atomic="false">
            {items.map(item => <QueueRow key={item.key} item={item} />)}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-white/10 px-4 py-3 text-[11px] text-white/50 sm:px-6">
        <button
          type="button"
          onClick={() => { void refresh(); }}
          disabled={refreshing}
          aria-label="Refresh today's public workshop queue"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388] disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          {connectionIssue ? 'Connection interrupted · retry now' : 'Auto-refresh every 45s · refresh'}
        </button>
        <span className="inline-flex items-center gap-1">Plates partially hidden for privacy <ArrowUpRight size={12} aria-hidden="true" /></span>
      </div>
    </div>
  );
}
