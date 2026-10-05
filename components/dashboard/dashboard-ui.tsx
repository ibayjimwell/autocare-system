'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  Gauge,
  Package,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardSection({
  title,
  description,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {href ? (
          <Link
            href={href}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open module
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export function DashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm md:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'primary' | 'warning' | 'critical' | 'success';
}) {
  const toneClasses = {
    neutral: 'bg-muted/70 text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-600',
    critical: 'bg-red-600/10 text-red-700',
    success: 'bg-emerald-500/10 text-emerald-600',
  } as const;

  return (
    <DashboardCard className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            toneClasses[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </DashboardCard>
  );
}

export function MiniBarChart({
  items,
  valueFormatter = (value) => String(value),
  emptyLabel = 'No data for this period.',
}: {
  items: Array<{ label: string; value: number; emphasis?: boolean }>;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex min-h-52 items-end gap-2 overflow-x-auto pb-2 pt-4">
      {items.map((item) => {
        const percentage = item.value > 0 ? Math.max(8, (item.value / max) * 100) : 2;

        return (
          <div
            key={item.label}
            className="flex min-w-[42px] flex-1 flex-col items-center gap-2"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {valueFormatter(item.value)}
            </span>
            <div className="flex h-36 w-full max-w-10 items-end rounded-md bg-muted/50 p-1">
              <div
                className={cn(
                  'w-full rounded-sm transition-[height] duration-500',
                  item.emphasis ? 'bg-primary' : 'bg-primary/45',
                )}
                style={{ height: `${percentage}%` }}
              />
            </div>
            <span className="max-w-16 truncate text-[11px] text-muted-foreground">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalMeter({
  label,
  value,
  max,
  helper,
}: {
  label: string;
  value: number;
  max: number;
  helper?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function SignalCard({
  severity,
  title,
  detail,
  href,
}: {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  href: string;
}) {
  const config = {
    info: {
      icon: BellRing,
      className: 'border-blue-500/20 bg-blue-500/5 text-blue-700',
    },
    warning: {
      icon: AlertTriangle,
      className: 'border-amber-500/25 bg-amber-500/5 text-amber-700',
    },
    critical: {
      icon: CircleAlert,
      className: 'border-red-500/25 bg-red-500/5 text-red-700',
    },
  } as const;

  const Icon = config[severity].icon;

  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-16 items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        config[severity].className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'critical' | 'primary';
}) {
  const classes = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/10 text-emerald-700',
    warning: 'bg-amber-500/10 text-amber-700',
    critical: 'bg-red-500/10 text-red-700',
    primary: 'bg-primary/10 text-primary',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        classes[tone],
      )}
    >
      {label}
    </span>
  );
}

export function EmptyDashboardState({
  title,
  description,
  icon: Icon = Gauge,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <DashboardCard className="flex min-h-32 items-center gap-4 border-dashed bg-muted/10">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </DashboardCard>
  );
}

