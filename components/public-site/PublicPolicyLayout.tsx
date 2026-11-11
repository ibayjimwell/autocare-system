import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
};

export default function PublicPolicyLayout({ eyebrow, title, introduction, children }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft aria-hidden="true" size={16} /> Back to homepage
      </Link>
      <div className="mt-5 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground md:text-sm">{introduction}</p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated November 11, 2026</p>
      </div>
      <article className="mt-8 space-y-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8 lg:p-10 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_p]:text-sm [&_p]:leading-7 [&_p]:text-muted-foreground [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </article>
    </div>
  );
}
