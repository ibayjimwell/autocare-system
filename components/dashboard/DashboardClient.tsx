'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Activity,
  CircleAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { DashboardData } from '@/database/models/dashboard/dashboard.model';
import { getTodayLabel } from '@/app-utils/dashboard/helpers';
import { useDashboardData } from '@/hooks/dashboard/useDashboardData';
import {
  DashboardCard,
} from './dashboard-ui';
import {
  AppointmentsDashboardSection,
  CustomersDashboardSection,
  DashboardOverviewSection,
  InventoryDashboardSection,
  PaymentsDashboardSection,
  ServiceTrackingDashboardSection,
  ServicesDashboardSection,
  StaffsDashboardSection,
} from './DashboardSections';

export default function DashboardClient({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { data: session } = useSession();
  const access = (session?.user?.access ?? initialData.access) as Record<string, boolean>;
  const accessKey = useMemo(
    () => Object.entries(access)
      .filter(([, allowed]) => allowed)
      .map(([module]) => module)
      .sort()
      .join('|'),
    [access],
  );

  const {
    data,
    refresh,
    isInitialLoading,
    isRefreshing,
    error,
  } = useDashboardData({
    initialData,
    accessKey,
  });

  return (
    <div className="space-y-8">
      <DashboardCard className="overflow-hidden border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Activity className="h-4 w-4" />
              Live operations dashboard
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Keep the workshop moving.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              AutoCare turns appointments, service progress, customer activity,
              payments, staffing, services, and inventory into one operational
              view so bottlenecks can be seen before they become customer delays.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              {getTodayLabel()}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Dashboard data is temporarily unavailable</p>
              <p className="mt-1 text-xs leading-5 text-amber-800/80">
                {error}. The rest of the application remains available and the
                existing dashboard snapshot will stay visible when one exists.
              </p>
            </div>
          </div>
        ) : null}
      </DashboardCard>

      {isInitialLoading ? (
        <DashboardCard className="border-primary/10 bg-primary/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Loading live dashboard analytics…
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This loads in the background so it does not block application navigation.
              </p>
            </div>
          </div>
        </DashboardCard>
      ) : null}

      <DashboardOverviewSection data={data} />

      {data.access.customers ? <CustomersDashboardSection data={data} /> : null}
      {data.access.appointments ? <AppointmentsDashboardSection data={data} /> : null}
      {data.access.services ? <ServicesDashboardSection data={data} /> : null}
      {data.access.staffs ? <StaffsDashboardSection data={data} /> : null}
      {data.access.serviceTracking ? <ServiceTrackingDashboardSection data={data} /> : null}
      {data.access.payments ? <PaymentsDashboardSection data={data} /> : null}
      {data.access.inventory ? <InventoryDashboardSection data={data} /> : null}
    </div>
  );
}
