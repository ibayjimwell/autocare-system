import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { getPublicSiteConfig } from '@/lib/public-site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact & Registered Business Information | AutoCare',
  description:
    'Contact AutoCare automotive service center in Sulipan, Apalit, Pampanga. View our registered business information, phone number, email and directions.',
};

const actionStyle =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D] focus-visible:ring-offset-2';

export default function ContactPage() {
  const business = getPublicSiteConfig();

  return (
    <div className="bg-[#f5f5f6] text-[#181a1e]">
      <section className="relative isolate overflow-hidden bg-[#111419] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-32 h-[340px] w-[340px] rounded-full bg-[#C1272D]/15 blur-[95px] md:h-[500px] md:w-[500px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[-6%] h-[180px] w-[280px] rounded-full bg-white/5 blur-[65px]"
        />
        <div className="relative mx-auto max-w-[1320px] px-4 pb-14 pt-10 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20 lg:pt-14">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]"
          >
            <ArrowLeft size={17} aria-hidden="true" /> Back to homepage
          </Link>

          <div className="mt-10 grid items-end gap-7 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,.7fr)] md:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ff9fa3]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#C1272D]" />
                We&apos;re here to help
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-.055em] text-white sm:text-5xl lg:text-[64px] lg:leading-[1.07]">
                Let&apos;s get your vehicle <span className="text-[#ff7d82]">back on track.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/65 sm:text-lg">
                Ask about maintenance, diagnostics, repairs, appointments, billing or after-service support.
                Reach our team using the contact details below.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={business.phoneHref}
                  className={`${actionStyle} bg-[#C1272D] text-white shadow-[0_9px_24px_rgba(193,39,45,.28)] hover:bg-[#ad2228]`}
                >
                  <Phone size={17} aria-hidden="true" /> Call our team
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${business.email}`}
                  className={`${actionStyle} border border-white/25 bg-white/10 text-white hover:bg-white/20`}
                >
                  <Mail size={17} aria-hidden="true" /> Send an email
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#C1272D]/20 text-[#ffa5a9]">
                  <MapPin size={21} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/55">Visit our service center</span>
              </div>
              <p className="mt-5 text-lg font-semibold leading-7 text-white">Sulipan, Apalit, Pampanga</p>
              <p className="mt-2 text-sm leading-7 text-white/65">{business.visitAddress}</p>
              <a
                href={business.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-[#ffb5b9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]"
              >
                View map search <ExternalLink size={15} aria-hidden="true" />
              </a>
              <p className="mt-1 text-xs leading-5 text-white/45">Confirm directions with our team before visiting.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="ways-to-contact" className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#C1272D]">Customer support</p>
          <h2 id="ways-to-contact" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Contact us your way
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#626873] sm:text-base">
            Whether you&apos;re planning a visit or checking on an existing service, these are the contact details provided for our business.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="group rounded-xl border border-[#e4e6e9] bg-white p-6 shadow-[0_15px_45px_rgba(20,25,30,.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#C1272D]/10 text-[#C1272D]"><Phone size={22} aria-hidden="true" /></div>
            <h3 className="mt-5 text-lg font-bold">Call or text</h3>
            <p className="mt-2 text-sm leading-6 text-[#707580]">Questions about services, bookings and appointment updates.</p>
            <a href={business.phoneHref} className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 break-all rounded-md text-base font-semibold text-[#C1272D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">
              {business.phone} <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="group rounded-xl border border-[#e4e6e9] bg-white p-6 shadow-[0_15px_45px_rgba(20,25,30,.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#C1272D]/10 text-[#C1272D]"><Mail size={22} aria-hidden="true" /></div>
            <h3 className="mt-5 text-lg font-bold">Email support</h3>
            <p className="mt-2 text-sm leading-6 text-[#707580]">Invoices, payments, cancellations, refunds or privacy inquiries.</p>
            <a href={`mailto:${business.email}`} className="mt-4 inline-flex min-h-11 max-w-full items-center gap-2 break-all rounded-md text-base font-semibold text-[#C1272D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">
              {business.email} <ArrowUpRight size={17} className="shrink-0" aria-hidden="true" />
            </a>
          </div>
          <div className="group rounded-xl border border-[#e4e6e9] bg-white p-6 shadow-[0_15px_45px_rgba(20,25,30,.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#C1272D]/10 text-[#C1272D]"><MapPin size={22} aria-hidden="true" /></div>
            <h3 className="mt-5 text-lg font-bold">Workshop location</h3>
            <p className="mt-2 text-sm leading-6 text-[#707580]">{business.visitAddress}</p>
            <a href={business.directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#C1272D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1272D]">
              Find directions <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="registered-details" className="border-y border-[#e3e4e7] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[.83fr_1.17fr] md:gap-10 md:py-16 lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#C1272D]/10 text-[#C1272D]"><Building2 size={23} aria-hidden="true" /></span>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[.18em] text-[#C1272D]">Business transparency</p>
            <h2 id="registered-details" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Know who you&apos;re booking with.</h2>
            <p className="mt-4 text-sm leading-7 text-[#636974] sm:text-base">
              {business.name} is our customer-facing service platform. The official business details below identify the registered automotive service provider behind it.
            </p>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#e4e6e9] bg-[#f6f7f8] p-4">
              <ShieldCheck size={21} className="mt-0.5 shrink-0 text-[#C1272D]" aria-hidden="true" />
              <p className="text-sm leading-6 text-[#515762]">Registered business details are presented separately from the AutoCare application brand for clarity.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e6e9] bg-white shadow-[0_20px_50px_rgba(16,24,40,.05)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0f2] bg-[#fafafa] px-5 py-4 sm:px-7">
              <p className="text-sm font-bold">Official business information</p>
              <CheckCircle2 className="shrink-0 text-[#C1272D]" size={21} aria-hidden="true" />
            </div>
            <dl className="divide-y divide-[#edf0f2] px-5 sm:px-7">
              <div className="grid gap-2 py-5 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-6">
                <dt className="text-xs font-bold uppercase tracking-[.10em] text-[#7a808a]">Platform brand</dt>
                <dd className="text-sm font-semibold leading-6 text-[#24272e]">{business.name}</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-6">
                <dt className="text-xs font-bold uppercase tracking-[.10em] text-[#7a808a]">Registered trade name</dt>
                <dd className="text-sm font-semibold leading-6 text-[#24272e]">{business.tradeName}</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-6">
                <dt className="text-xs font-bold uppercase tracking-[.10em] text-[#7a808a]">Registered proprietor</dt>
                <dd className="text-sm font-semibold leading-6 text-[#24272e]">{business.legalName}</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-6">
                <dt className="text-xs font-bold uppercase tracking-[.10em] text-[#7a808a]">BIR-registered address</dt>
                <dd className="text-sm font-medium leading-7 text-[#24272e]">{business.address}</dd>
              </div>
              <div className="grid gap-2 py-5 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-6">
                <dt className="text-xs font-bold uppercase tracking-[.10em] text-[#7a808a]">Business activity</dt>
                <dd className="text-sm font-medium leading-7 text-[#24272e]">Motor vehicle maintenance and repair services</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="grid gap-6 rounded-xl bg-[#181b21] p-6 text-white sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-10 lg:p-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#ff9da2]">Your information matters</p>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">Clear services. Transparent support.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              You can browse services and prices without signing in. Appointment records, estimates and invoices remain within the authenticated customer or staff experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:max-w-[220px]">
            <Link href="/terms" className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">Terms</Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">Privacy</Link>
            <Link href="/refund-policy" className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">Refunds</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
