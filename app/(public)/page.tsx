import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck2,
  CarFront, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, CreditCard,
  Download, FileCheck2, Gauge, MapPin, ScanLine, ShieldCheck,
  Smartphone, TrendingUp, Wrench,
} from 'lucide-react';
import LiveWorkshopQueue from '@/components/public-site/LiveWorkshopQueue';
import LandingReveal from '@/components/public-site/LandingReveal';
import ServiceCatalog from '@/components/public-site/ServiceCatalog';
import { getPublicCatalog } from '@/lib/public-catalog';
import { getPublicLiveQueue, getPublicTrendingServices } from '@/lib/public-landing';
import { getPublicSiteConfig } from '@/lib/public-site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { name } = getPublicSiteConfig();
  return {
    title: `${name} — Automotive Maintenance, Repair & Diagnostics`,
    description: `Explore live ${name} automotive service prices, preventative maintenance, repairs, diagnostics, today's workshop queue, and our customer app. Public browsing without sign-in.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${name} | Vehicle Care You Can Follow`,
      description: `Live automotive services and base prices. Browse today's service queue, repairs and diagnostics without logging in.`,
      type: 'website',
    },
  };
}

const journey = [
  { number: '01', icon: CalendarCheck2, title: 'Book your visit', body: 'Choose your vehicle, select the right service, and reserve an available appointment in AutoCare Mobile.' },
  { number: '02', icon: ScanLine, title: 'Know what needs work', body: 'Our team checks the vehicle, documents findings and prepares a clear estimate for review.' },
  { number: '03', icon: Wrench, title: 'Follow every stage', body: 'Stay in the loop from inspection and approval through active work and completion.' },
  { number: '04', icon: FileCheck2, title: 'Settle with clarity', body: 'Review your final invoice and pay through a method available for your appointment.' },
];

const questions = [
  { q: 'Can I browse services and prices without an account?', a: 'Yes. All currently active services, descriptions and configured base prices are publicly displayed here. Your personal booking and invoice records remain private in the mobile app.' },
  { q: 'Are the prices here the final amount I will pay?', a: 'Not necessarily. The listed prices are the service catalog base prices. The final amount depends on vehicle condition, parts, approved additional work, labor, fees and applicable discounts. You can review an appointment-specific estimate before work that requires approval.' },
  { q: 'Why are some vehicle plate numbers hidden?', a: 'The public queue provides a general view of today’s confirmed and in-progress workshop activity. Registration plate numbers are partially hidden to respect customer privacy. Full appointment details are available only to authorized users.' },
  { q: 'How do I book an appointment?', a: 'Booking and personal service tracking are provided through the AutoCare Mobile app. Until the Android APK is published, please contact the service center to arrange access or ask about booking options.' },
  { q: 'Can I pay on this website?', a: 'No. This public website provides service information, not a checkout. Payment methods are shown to the customer in the app or confirmed by authorized staff. Online-gateway functionality is subject to payment-provider activation.' },
  { q: 'How do cancellations and refunds work?', a: 'Requests are handled under the applicable appointment status, payment method and AutoCare cancellation and refund policy. The full policy is linked below, and our service team can assist with specific questions.' },
];

const php = (amount: string | null) => {
  if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) return 'By estimate';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(amount));
};
const niceTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default async function HomePage() {
  const [catalog, liveQueue, popular] = await Promise.all([
    getPublicCatalog(), getPublicLiveQueue(), getPublicTrendingServices(),
  ]);
  const business = getPublicSiteConfig();
  const typeCounts = {
    PMS: catalog.services.filter(item => item.type === 'PMS').length,
    REPAIR: catalog.services.filter(item => item.type === 'REPAIR').length,
    DIAGNOSTIC: catalog.services.filter(item => item.type === 'DIAGNOSTIC').length,
  };
  const hasBookings = popular.some(item => item.bookingCount > 0);
  const hours = catalog.standardHours
    ? `${niceTime(catalog.standardHours.opening)} – ${niceTime(catalog.standardHours.closing)}`
    : null;
  // A NULL catalog price is not a free service.
  const pricedValues = catalog.services.filter(item => item.basePrice != null)
    .map(item => Number(item.basePrice)).filter(value => Number.isFinite(value) && value >= 0);
  const minPrice = pricedValues.length ? Math.min(...pricedValues) : null;

  return (
    <>
      <LandingReveal />
      <section className="ac-hero relative isolate overflow-hidden text-white" aria-label="AutoCare automotive services introduction">
        <div className="ac-hero-glow" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-[1320px] gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(415px,.91fr)] lg:items-center lg:gap-12 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="relative max-w-2xl">
            <div className="ac-hero-title inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.19em] text-white/85 backdrop-blur-md sm:text-[11px]">
              <span className="size-1.5 rounded-full bg-[#f36c71]" aria-hidden="true" /> Smarter automotive care, every visit
            </div>
            <h1 className="ac-hero-title mt-7 max-w-[650px] text-[clamp(3.35rem,6vw,5.9rem)] font-black leading-[.99] tracking-[-.07em]">
              GOOD CARS.<br />
              <span className="text-[#fa767b]">GREAT CARE.</span><br />
              NO GUESSWORK.
            </h1>
            <p className="ac-hero-copy mt-7 max-w-xl text-base leading-8 text-white/75 sm:text-lg sm:leading-8">
              From routine maintenance to complex repairs, {business.name} makes the service journey clearer. Explore real service prices, check today&apos;s workshop activity, and stay connected to your vehicle.
            </p>
            <div className="ac-hero-action mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#services" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#C1272D] px-6 text-sm font-bold text-white shadow-[0_8px_30px_rgba(193,39,45,.33)] transition-transform hover:-translate-y-0.5 hover:bg-[#a51c22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a8d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101319]">
                Explore services & prices <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="#live-queue" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a8d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101319]">
                View live queue <ArrowDownRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className="ac-hero-action mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-xs font-medium text-white/70">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="text-[#fa858a]" size={16} aria-hidden="true" />Transparent base prices</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="text-[#fa858a]" size={16} aria-hidden="true" />Service tracking</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="text-[#fa858a]" size={16} aria-hidden="true" />Estimate review</span>
            </div>
            {business.address && <p className="mt-8 flex max-w-lg items-start gap-2 text-xs leading-6 text-white/55"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{business.address}</p>}
          </div>
          <div id="live-queue" className="relative scroll-mt-24 justify-self-stretch lg:justify-self-end">
            <div aria-hidden="true" className="absolute -inset-4 rounded-[30px] bg-[#C1272D]/10 blur-3xl" />
            <LiveWorkshopQueue initialFeed={liveQueue} />
          </div>
        </div>
        <p className="absolute bottom-2 right-4 z-10 text-[9px] text-white/45 sm:right-8">Workshop photograph for illustration <a className="underline underline-offset-2 hover:text-white" href="https://www.pexels.com/photo/a-mechanic-working-on-an-engine-in-an-auto-repair-shop-8986040/" target="_blank" rel="noopener noreferrer">Artem Podrez / Pexels</a></p>
      </section>

      <section className="relative z-[1] border-b border-[#e8e8eb] bg-white" aria-label="AutoCare service highlights">
        <div className="mx-auto grid max-w-[1320px] divide-y divide-[#e9e9ed] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {[
            { icon: Gauge, value: catalog.unavailable ? '—' : String(catalog.services.length), caption: 'Active service options', sub: 'Direct from our catalog' },
            { icon: CarFront, value: catalog.unavailable ? '—' : String(typeCounts.PMS + typeCounts.REPAIR + typeCounts.DIAGNOSTIC), caption: 'Maintenance, repair & diagnostics', sub: 'Explore what your vehicle needs' },
            { icon: Clock3, value: hours || 'By appointment', caption: 'Standard booking window', sub: 'Date-specific hours can vary' },
          ].map(item => <div key={item.caption} className="flex items-center gap-4 px-1 py-6 sm:px-5 lg:py-8">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#C1272D]"><item.icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-[21px] font-extrabold tracking-[-.045em] text-[#202329]">{item.value}</p><p className="text-xs font-semibold text-[#42464f]">{item.caption}</p><p className="mt-1 text-[11px] text-[#9396a0]">{item.sub}</p></div>
          </div>)}
        </div>
      </section>

      <section id="popular" className="scroll-mt-24 bg-[#f6f6f7] py-20 md:py-24">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div data-ac-reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C1272D]">Discover what drivers need</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] text-[#1c1e23] sm:text-4xl lg:text-[43px]">{hasBookings ? 'Trending services right now.' : 'Services worth exploring.'}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#737781]">{hasBookings ? 'Based on currently active, non-cancelled service bookings in AutoCare.' : 'Browse services currently available in our live automotive service catalog.'}</p>
            </div>
            <Link href="#services" className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-md border border-[#dedfe4] bg-white px-5 text-sm font-bold text-[#282b32] transition-colors hover:border-[#C1272D] hover:text-[#C1272D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">Full catalog <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          {popular.length ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {popular.map((item, index) => (
                <article key={item.id} data-ac-reveal className="ac-lift-card group flex flex-col overflow-hidden rounded-[18px] border border-[#e4e5e9] bg-white shadow-sm">
                  <div className={`relative flex h-32 items-start justify-between overflow-hidden p-5 ${['bg-[#212731]','bg-[#38312f]','bg-[#292d30]','bg-[#262b31]'][index % 4]}`}>
                    <span className="relative z-10 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold text-white/80">0{index + 1} / {item.category === 'PMS' ? 'Maintenance' : item.category === 'REPAIR' ? 'Repair' : item.category === 'DIAGNOSTIC' ? 'Diagnostic' : 'Service'}</span>
                    <span className="absolute -bottom-8 -right-7 text-white/[0.055] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"><Wrench size={170} strokeWidth={.8} aria-hidden="true" /></span>
                    <span className="relative z-10 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white"><TrendingUp size={20} aria-hidden="true" /></span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold tracking-tight text-[#202329]">{item.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-11 text-sm leading-6 text-[#7a7c85]">{item.description?.trim() || 'Explore this automotive service and its current base pricing.'}</p>
                    <div className="mt-6 border-t border-[#ebebed] pt-4">
                      <p className="text-[11px] font-semibold text-[#90949b]">Listed base price</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-[-.05em] text-[#1b1e25]">{php(item.basePrice)}</p>
                      {hasBookings && item.bookingCount > 0 && <p className="mt-2 text-[11px] text-[#9a5659]">{item.bookingCount} current {item.bookingCount === 1 ? 'booking' : 'bookings'}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div role="status" className="mt-9 rounded-xl border border-[#e5e5e8] bg-white p-6 text-sm text-[#737781]">Trending service data is temporarily unavailable. Explore the live service catalog below.</div>
          )}
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-white py-20 md:py-24 lg:py-28">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div data-ac-reveal className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="ac-accent-line" aria-hidden="true" />
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#C1272D]">What we do</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] text-[#1b1e24] sm:text-4xl lg:text-[43px]">Everything your car needs.<br className="hidden sm:block" /> Nothing you don&apos;t.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#777a83]">Real active services, descriptions, estimated service times, labor information and base prices—read directly from AutoCare&apos;s database.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ['PMS', typeCounts.PMS], ['Repair', typeCounts.REPAIR], ['Diagnostic', typeCounts.DIAGNOSTIC],
              ].map(([label, count]) => <div key={label} className="min-w-[91px] rounded-xl border border-[#e9e9ed] bg-[#f7f7f8] p-3 text-center sm:min-w-[102px]">
                <p className="text-xl font-extrabold tracking-tight text-[#22252a]">{catalog.unavailable ? '—' : count}</p><p className="text-[11px] text-[#767981]">{label}</p>
              </div>)}
            </div>
          </div>
          <ServiceCatalog services={catalog.services} unavailable={catalog.unavailable} />
          {minPrice !== null && <p className="mt-3 text-xs text-[#a0a2a9]">Lowest currently configured base price: {php(String(minPrice))}. This does not represent an all-inclusive repair quote.</p>}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 overflow-hidden border-y border-[#e5e6e9] bg-[#f6f6f7] py-20 md:py-24 lg:py-28">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
            <div data-ac-reveal>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C1272D]">One connected service journey</p>
              <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-[1.12] tracking-[-.055em] text-[#1d2026] sm:text-4xl lg:text-[46px]">We fix cars.<br /> You stay informed.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#727781]">Vehicle care should never feel like a black box. AutoCare links booking, inspections, estimate approval and service progress in one connected journey.</p>
              <div className="ac-photo-panel relative mt-8 h-[290px] overflow-hidden rounded-[22px] border border-[#e0e1e5] shadow-[0_25px_65px_rgba(26,32,39,.11)] sm:h-[345px]">
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white sm:p-7">
                  <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Workshop care</p><p className="mt-2 max-w-xs text-xl font-bold tracking-tight">Every step matters.</p></div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-md"><Wrench size={22} aria-hidden="true" /></span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-[#989aa2]">Illustrative photo: <a href="https://www.pexels.com/photo/mechanics-working-with-cars-4116231/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#C1272D]">Jose Ricardo Barraza Morachis / Pexels</a></p>
            </div>
            <div className="relative space-y-3">
              <span className="ac-timeline-line absolute bottom-[42px] left-[26px] top-[35px] hidden w-[2px] sm:block" aria-hidden="true" />
              {journey.map((item, index) => <article data-ac-reveal key={item.number} className="ac-lift-card relative z-10 flex gap-4 rounded-2xl border border-[#e5e6e9] bg-white p-5 shadow-sm sm:gap-5 sm:p-6">
                <span className="relative flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-[#faeded] text-[#C1272D]"><item.icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="text-[17px] font-bold tracking-tight text-[#1e2026]">{item.title}</h3><span className="font-mono text-xs font-bold text-[#c5c7cc]">{item.number}</span></div><p className="mt-2 text-sm leading-6 text-[#737783]">{item.body}</p></div>
                {index === journey.length - 1 && <span className="sr-only">Last step</span>}
              </article>)}
            </div>
          </div>
        </div>
      </section>

      <section id="app" className="scroll-mt-24 bg-white py-20 md:py-24 lg:py-28">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="relative isolate grid overflow-hidden rounded-[26px] bg-[#171b22] px-6 py-12 text-white sm:px-10 lg:grid-cols-[1fr_.8fr] lg:items-center lg:px-16 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-48 size-[600px] rounded-full bg-[#C1272D]/25 blur-[100px]" />
            <div data-ac-reveal className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-white/80"><Smartphone size={14} aria-hidden="true" /> AutoCare mobile</span>
              <h2 className="mt-6 text-3xl font-extrabold leading-tight tracking-[-.055em] sm:text-4xl lg:text-[46px]">Your service center.<br /><span className="text-[#fa767b]">In your pocket.</span></h2>
              <p className="mt-5 max-w-lg text-sm leading-8 text-white/70">Choose services, manage vehicles, book a visit, review estimates, track repair progress, and see final invoices in the AutoCare customer app.</p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/70"><span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-[#ff9da1]" aria-hidden="true" />Booking</span><span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-[#ff9da1]" aria-hidden="true" />Service tracking</span><span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-[#ff9da1]" aria-hidden="true" />Invoices</span></div>
              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {business.androidApkUrl ? (
                  <a href={business.androidApkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#C1272D] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#aa2026] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a8d]"><Download size={19} aria-hidden="true" /> Download for Android <ArrowUpRight size={16} aria-hidden="true" /></a>
                ) : (
                  <button type="button" disabled aria-disabled="true" title="The Android APK is not released yet" className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-[#C1272D]/70 px-6 text-sm font-bold text-white/85"><Download size={19} aria-hidden="true" /> Download for Android</button>
                )}
                {!business.androidApkUrl && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75">APK coming soon</span>}
              </div>
              {!business.androidApkUrl && <p className="mt-3 text-xs leading-6 text-white/50">The Android installer is not yet published. Contact the service center for current booking assistance.</p>}
            </div>
            <div className="relative mx-auto mt-14 w-full max-w-[355px] lg:mt-0 lg:justify-self-center" aria-label="Illustrative mobile app preview">
              <div className="ac-phone relative mx-auto w-[260px] overflow-hidden rounded-[35px] border-[7px] border-[#464a54] bg-[#f5f6f8] text-[#22252c] sm:w-[278px]">
                <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#16181f]" aria-hidden="true" />
                <div className="bg-[#C1272D] px-5 pb-8 pt-12 text-white"><p className="text-[11px] font-semibold text-white/70">AutoCare Mobile · Preview</p><p className="mt-2 text-2xl font-bold tracking-tight">Your vehicle,<br />your updates.</p><div className="mt-5 rounded-xl bg-white/15 p-3 text-[11px]"><div className="flex items-center justify-between"><span>Service progress</span><CheckCircle2 size={16} aria-hidden="true" /></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full w-3/4 rounded-full bg-white" /></div><p className="mt-2 text-white/70">Track inspection to completion</p></div></div>
                <div className="space-y-2.5 p-4"><p className="pb-1 text-[12px] font-bold text-[#30333a]">Services at a glance</p>{[
                  { icon: CarFront, name: 'Maintenance', text: 'Check recommended care' },
                  { icon: Wrench, name: 'Repairs', text: 'Follow work in progress' },
                  { icon: CreditCard, name: 'Payments', text: 'Review your final bill' },
                ].map(card => <div key={card.name} className="flex items-center gap-2.5 rounded-xl border border-[#ececf0] bg-white p-3 shadow-sm"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-[#C1272D]"><card.icon size={18} aria-hidden="true" /></span><div><p className="text-[11px] font-bold">{card.name}</p><p className="text-[9px] text-[#8c8f98]">{card.text}</p></div></div>)}<p className="pt-1 text-center text-[10px] text-[#a1a3aa]">Illustration · no customer data</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="payments" className="scroll-mt-24 border-y border-[#e8e9ec] bg-[#f6f6f7] py-20 md:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:items-center lg:gap-20 lg:px-8">
          <div data-ac-reveal>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C1272D]">Pricing & payment clarity</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.05em] text-[#1d2026] sm:text-4xl">Know the service.<br /> Review the estimate.<br /> Stay in control.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#747882]">The public catalog is for browsing. The actual estimate, approvals, final bill and payments relate to a specific customer appointment and stay in the authenticated mobile experience.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#747882]">This website does not collect payment or charge a booking/placement fee. Online payment options depend on provider activation. Cash and other methods are available only when confirmed by the service center or displayed in the customer app.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/terms" className="inline-flex min-h-11 items-center rounded-md border border-[#dadce0] bg-white px-5 text-sm font-semibold text-[#292c34] hover:border-[#C1272D] hover:text-[#C1272D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">Terms & Conditions</Link><Link href="/refund-policy" className="inline-flex min-h-11 items-center rounded-md border border-[#dadce0] bg-white px-5 text-sm font-semibold text-[#292c34] hover:border-[#C1272D] hover:text-[#C1272D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">Refunds & cancellations</Link></div>
          </div>
          <div data-ac-reveal className="rounded-[22px] border border-[#e4e6e9] bg-white p-6 shadow-[0_20px_60px_rgba(20,25,30,.045)] sm:p-8">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-[#24272e]">A transparent billing journey</p><ShieldCheck className="text-[#C1272D]" size={22} aria-hidden="true" /></div>
            <div className="mt-7 space-y-5">{[
              { icon: ClipboardCheck, title: 'Vehicle assessment', text: 'Receive findings and recommended work.' },
              { icon: FileCheck2, title: 'Estimate review', text: 'Approve service-specific costs before applicable work.' },
              { icon: CreditCard, title: 'Final invoice', text: 'See billed items and available settlement methods.' },
            ].map((item, index) => <div key={item.title} className="flex gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#C1272D]"><item.icon size={20} aria-hidden="true" /></span><div className="flex-1 border-b border-[#ececef] pb-5 last:border-0"><p className="text-sm font-bold text-[#26292f]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#747883]">{item.text}</p></div><span className="text-xs font-semibold text-[#b6b9bf]">0{index + 1}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-[1050px] px-4 sm:px-6 lg:px-8">
          <div data-ac-reveal className="text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#C1272D]">Good to know</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] text-[#1b1e24] sm:text-4xl">Questions, answered.</h2><p className="mt-4 text-sm leading-7 text-[#777b85]">A little more clarity before your next visit.</p></div>
          <div className="mt-9 grid gap-3 md:grid-cols-2">{questions.map(item => <details key={item.q} className="group rounded-2xl border border-[#e7e8eb] bg-[#fafafb] p-5 transition-colors open:bg-white open:shadow-sm"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold leading-6 text-[#282b32] outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#C1272D] [&::-webkit-details-marker]:hidden">{item.q}<ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#C1272D] transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-7 text-[#727781]">{item.a}</p></details>)}</div>
        </div>
      </section>

      <section className="bg-[#C1272D] py-12 text-white md:py-16">
        <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Let&apos;s keep your vehicle moving</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Have a question about a service?</h2><p className="mt-2 text-sm text-white/80">We&apos;re happy to help with service options, schedule information, or billing inquiries.</p></div>
          <Link href="/contact" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-md bg-white px-6 text-sm font-bold text-[#9c1b21] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#C1272D]">Contact us <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
