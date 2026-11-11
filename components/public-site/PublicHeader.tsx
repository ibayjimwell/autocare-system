'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CarFront, Download, Menu, X } from 'lucide-react';

const links = [
  { href: '/#services', label: 'Services' },
  { href: '/#popular', label: 'Popular' },
  { href: '/#live-queue', label: 'Live queue' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/contact', label: 'Contact' },
];

export default function PublicHeader({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open]);

  return (
    <header className="ac-site-header sticky top-0 z-50 border-b border-white/10 bg-[#14171b]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${name} homepage`}
          onClick={() => setOpen(false)}
          className="group flex min-h-11 min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#C1272D] text-white shadow-[0_5px_20px_rgba(193,39,45,.27)] transition-transform group-hover:-rotate-3">
            <CarFront aria-hidden="true" size={25} strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 flex-col justify-center leading-tight">
            <span className="truncate text-[19px] font-extrabold tracking-[-.055em] text-white">{name}</span>
            <span className="truncate text-[9px] font-semibold uppercase tracking-[.18em] text-white/55">Automotive service center</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-10 items-center rounded-md px-3 text-[13px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex md:items-center md:gap-2">
          <Link href="/#app" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 text-[13px] font-semibold text-white transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">
            <Download size={16} aria-hidden="true" />Android app <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="autocare-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(current => !current)}
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388] lg:hidden"
        >
          {open ? <X aria-hidden="true" size={23} /> : <Menu aria-hidden="true" size={23} />}
        </button>
      </div>
      {open && (
        <nav id="autocare-mobile-nav" aria-label="Mobile navigation" className="ac-mobile-nav border-t border-white/10 bg-[#15181d] px-4 pb-4 pt-3 shadow-xl sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-1">
            {links.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">{link.label}</Link>
            ))}
            <Link href="/#app" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#C1272D] px-4 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8388]">
              <Download size={17} aria-hidden="true" /> Android app
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
