import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CarFront, Mail, MapPin, Phone } from 'lucide-react';
import PublicHeader from '@/components/public-site/PublicHeader';
import { getPublicSiteConfig } from '@/lib/public-site';
import '@/components/public-site/landing.css';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const business = getPublicSiteConfig();
  return (
    <div
      className="ac-public min-h-screen bg-[#F5F5F6] text-[#17191d]"
      style={{ '--primary': '357.66 66.38% 45.49%', '--ring': '357.66 66.38% 45.49%' } as CSSProperties}
    >
      <a href="#main-content" className="sr-only fixed left-3 top-2 z-[100] rounded-md bg-white px-4 py-2 text-black focus:not-sr-only focus-visible:ring-2 focus-visible:ring-[#C1272D]">Skip to content</a>
      <PublicHeader name={business.name} />
      <main id="main-content">{children}</main>
      <footer className="bg-[#111419] text-white">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.15fr_1fr_.8fr] lg:gap-20 lg:px-8 lg:py-20">
          <div>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-md text-xl font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#C1272D]"><CarFront size={23} aria-hidden="true" /></span>{business.name}
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">Smart automotive maintenance, repairs and diagnostics. Explore live services and base prices on the website, then manage your appointment and invoice in AutoCare Mobile.</p>
            <p className="mt-5 text-xs leading-6 text-white/45">Registered trade name: {business.tradeName}</p>
            <p className="mt-1 text-xs leading-6 text-white/45">Operated by: {business.legalName}</p>
          </div>
          <div>
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[.18em] text-white/50">Visit & contact</h2>
            <div className="space-y-3.5 text-sm leading-6 text-white/70">
              {business.address && <p className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-[#ff8186]" size={17} aria-hidden="true" />{business.address}</p>}
              {business.email && <a className="flex min-h-9 items-center gap-3 break-all hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]" href={`mailto:${business.email}`}><Mail className="shrink-0 text-[#ff8186]" size={17} aria-hidden="true" />{business.email}</a>}
              {business.phone && <a className="flex min-h-9 items-center gap-3 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]" href={business.phoneHref}><Phone className="shrink-0 text-[#ff8186]" size={17} aria-hidden="true" />{business.phone}</a>}
              <Link href="/contact" className="inline-flex min-h-9 items-center gap-2 font-semibold text-white hover:text-[#ffb2b6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">Business information <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
          <nav aria-label="Footer links">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[.18em] text-white/50">Explore AutoCare</h2>
            <div className="flex flex-col items-start gap-2.5">
              {[
                ['/#services', 'Services & pricing'],
                ['/#popular', 'Popular services'],
                ['/#live-queue', 'Today\'s workshop queue'],
                ['/#app', 'Android app'],
                ['/terms', 'Terms & Conditions'],
                ['/privacy', 'Privacy Policy'],
                ['/refund-policy', 'Cancellation & Refund Policy'],
              ].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-8 items-center rounded-md text-sm text-white/65 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">{label}</Link>)}
            </div>
          </nav>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/45">
          © {new Date().getFullYear()} {business.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
