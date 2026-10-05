import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth/staffs/auth';
import { getDashboardData } from '@/utils/dashboard/dashboard-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: true,
        errorType: 'auth',
        errorTitle: 'Unauthorized',
        errorMessage: 'A valid staff session is required.',
      },
      { status: 401 },
    );
  }

  try {
    const data = await getDashboardData(
      session.user.access as Record<string, boolean> | null | undefined,
    );

    return NextResponse.json(
      {
        error: false,
        message: 'Dashboard analytics retrieved successfully.',
        data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'DASHBOARD_ACCESS_REQUIRED') {
      return NextResponse.json(
        {
          error: true,
          errorType: 'auth',
          errorTitle: 'Dashboard access required',
          errorMessage: 'Your staff account does not have Dashboard access.',
        },
        { status: 403 },
      );
    }

    console.error('[GET /api/dashboard] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorType: 'dbe',
        errorTitle: 'Dashboard analytics unavailable',
        errorMessage: 'Unable to load dashboard analytics right now.',
        errorLog: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
