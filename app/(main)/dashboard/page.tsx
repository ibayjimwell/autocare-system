import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth/staffs/auth';
import { createEmptyDashboardData } from '@/database/models/dashboard/dashboard.model';
import DashboardClient from '@/components/dashboard/DashboardClient';

/*
 * IMPORTANT:
 *
 * Do not call getDashboardData() from this Server Component.
 *
 * Dashboard analytics can involve many independent aggregate queries. When
 * those queries are awaited here, the App Router cannot finish the page
 * response until the database work completes. A slow/temporarily saturated
 * database therefore makes navigation look like the entire application is
 * stuck on "loading".
 *
 * We only perform the cheap authentication/RBAC gate here. The analytics are
 * fetched by the mounted client through /api/dashboard, so the route itself
 * completes immediately.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const access = (session.user.access ?? {}) as Record<string, boolean>;

  if (access.dashboard !== true) {
    redirect('/unauthorized');
  }

  const initialData = createEmptyDashboardData(access);

  return <DashboardClient initialData={initialData} />;
}
