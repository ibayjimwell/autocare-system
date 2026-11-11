'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CarFront, Clock3, Search, SlidersHorizontal, Wrench, X } from 'lucide-react';
import type { PublicService } from '@/lib/public-catalog';

const filters = [
  { id: 'ALL', label: 'All services' },
  { id: 'PMS', label: 'Maintenance' },
  { id: 'REPAIR', label: 'Repairs' },
  { id: 'DIAGNOSTIC', label: 'Diagnostics' },
];

export function moneyPHP(value: string | null) {
  if (!value?.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function prettyDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

const names: Record<string, string> = { PMS: 'Preventive maintenance', REPAIR: 'Repair service', DIAGNOSTIC: 'Diagnostics' };
const categoryIcons: Record<string, typeof Wrench> = { PMS: CarFront, REPAIR: Wrench, DIAGNOSTIC: SlidersHorizontal };

export default function ServiceCatalog({ services, unavailable }: { services: PublicService[]; unavailable: boolean }) {
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return services.filter(item =>
      (filter === 'ALL' || (filter === 'OTHER' ? !['PMS', 'REPAIR', 'DIAGNOSTIC'].includes(item.type) : item.type === filter)) &&
      (!search || [item.name, item.description, item.type, item.subcategory].some(field => field?.toLowerCase().includes(search)))
    );
  }, [services, filter, query]);
  const display = showAll || query.trim() || filter !== 'ALL' ? filtered : filtered.slice(0, 6);
  const extraTypes = services.some(item => !['PMS', 'REPAIR', 'DIAGNOSTIC'].includes(item.type));

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e7e8eb] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
        <div className="relative w-full md:max-w-md">
          <label htmlFor="public-service-search" className="sr-only">Search active AutoCare services</label>
          <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8c94]" />
          <input
            id="public-service-search"
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setShowAll(false); }}
            placeholder="Search services, repairs, or diagnostics"
            className="h-12 w-full rounded-md border border-[#e3e4e8] bg-[#F6F7F8] pl-11 pr-4 text-base text-[#202228] placeholder:text-[#94959b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D] md:h-10 md:text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#767983]" aria-live="polite">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span><strong className="font-semibold text-[#282a30]">{filtered.length}</strong> active {filtered.length === 1 ? 'service' : 'services'}</span>
        </div>
      </div>
      <div className="-mx-1 mt-5 flex items-center gap-2 overflow-x-auto px-1 pb-2" aria-label="Service category filters">
        {[...filters, ...(extraTypes ? [{ id: 'OTHER', label: 'Other' }] : [])].map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => { setFilter(item.id); setShowAll(false); }}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D] md:min-h-9 ${filter === item.id ? 'border-[#C1272D] bg-[#C1272D] text-white shadow-[0_4px_12px_rgba(193,39,45,.17)]' : 'border-[#e4e5e8] bg-white text-[#555963] hover:border-[#c5c8cf] hover:text-[#191b20]'}`}
          >{item.label}</button>
        ))}
      </div>
      {unavailable ? (
        <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">The service catalog is temporarily unavailable. Contact AutoCare for current availability and prices.</div>
      ) : services.length === 0 ? (
        <div role="status" className="mt-5 rounded-xl border border-[#e7e8eb] bg-white p-8 text-sm leading-7 text-[#696d76]">There are no active services listed right now. Contact the center for details.</div>
      ) : display.length === 0 ? (
        <div role="status" className="mt-5 flex flex-col items-start gap-4 rounded-xl border border-[#e7e8eb] bg-white p-8">
          <p className="text-sm text-[#646976]">No matching services. Try a different search or category.</p>
          <button type="button" onClick={() => { setFilter('ALL'); setQuery(''); setShowAll(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#C1272D] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]"><X size={15} aria-hidden="true" />Clear filters</button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
            {display.map(item => {
              const Icon = categoryIcons[item.type] ?? Wrench;
              const price = moneyPHP(item.basePrice);
              const duration = prettyDuration(item.estimatedDuration);
              return (
                <article key={item.id} className="ac-lift-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e7e8eb] bg-white p-5 shadow-[0_3px_15px_rgba(20,25,30,.025)] md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#fef0f0] text-[#C1272D] transition-colors group-hover:bg-[#C1272D] group-hover:text-white"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className="rounded-full bg-[#f4f5f6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#6b6e77]">{names[item.type] ?? 'Automotive service'}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold leading-snug tracking-[-.03em] text-[#1e2026]">{item.name}</h3>
                  {item.subcategory && <p className="mt-1 text-xs font-semibold text-[#C1272D]">{item.subcategory}</p>}
                  <p className="mt-3 line-clamp-3 min-h-[66px] flex-1 whitespace-pre-line text-sm leading-[22px] text-[#737782]">{item.description?.trim() || 'Ask our team about this service and the recommended maintenance scope.'}</p>
                  <div className="mt-5 border-t border-[#edeef0] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[.09em] text-[#9598a0]">Starting / base price</p>
                    <p className="mt-1 text-[26px] font-extrabold tracking-[-.05em] text-[#181a1f]">{price ?? 'By estimate'}</p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-[#717681]">
                      {duration && <span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />Approx. {duration}</span>}
                      <span className="inline-flex items-center gap-1.5"><Wrench size={14} aria-hidden="true" />{item.isLaborInclude ? 'Labor included' : 'Labor may be extra'}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!query.trim() && filter === 'ALL' && !showAll && filtered.length > 6 && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => setShowAll(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#d9dadd] bg-white px-6 text-sm font-bold text-[#22252b] transition hover:border-[#C1272D] hover:text-[#C1272D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">View all {filtered.length} services <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          )}
        </>
      )}
      <p className="mt-7 text-xs leading-6 text-[#8c8e96]">Service prices come from the active AutoCare catalog. These are base prices, not final quotations; parts, vehicle condition, approved additional work, fees and discounts may change your final estimate or invoice.</p>
    </div>
  );
}
